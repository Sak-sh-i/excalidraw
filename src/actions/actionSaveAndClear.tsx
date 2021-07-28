import { getDefaultAppState } from "../appState";
import { newElementWith } from "../element/mutateElement";
import { saveAndClear } from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { register } from "./register";
import { useIsMobile } from "../components/App";
import { supported as fsSupported } from "browser-fs-access";

// save blob as png
import { serializeAsJSON } from "../data/json";
import { ExcalidrawElement } from "../element/types";
import { AppState } from "../types";
import { exportToCanvas } from "../scene/export";
import { getNonDeletedElements } from "../element/index";
import { canvasToBlob } from "../data/blob";
// import { fileSave } from "browser-fs-access";

const saveAsImg = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
) => {
  // const serialized = serializeAsJSON(elements, appState);
  // // To be saved blob
  // const blob = new Blob([serialized], {
  //   type: MIME_TYPES.excalidraw,
  // });

  // save as png
  const nonDeletedElements = getNonDeletedElements(elements);
  const exportBackground: boolean = false;
  const viewBackgroundColor: string = "#fff";
  const tempCanvas = exportToCanvas(nonDeletedElements, appState, {
    exportBackground,
    viewBackgroundColor,
  });
  tempCanvas.style.display = "none";
  document.body.appendChild(tempCanvas);
  let blob = await canvasToBlob(tempCanvas);
  tempCanvas.remove();
  // const fileName = `img.png`;
  if (appState.exportEmbedScene) {
    blob = await (
      await import(/* webpackChunkName: "image" */ "../data/image")
    ).encodePngMetadata({
      blob,
      metadata: serializeAsJSON(elements, appState),
    });
  }

  // return await fileSave(
  //   blob,
  //   {
  //     fileName,
  //     extensions: [".png"],
  //   },
  //   null,
  // );

  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const base64data = reader.result;
    // send to api
    const requestOptions: RequestInit = {
      method: "POST",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        img: {
          data: base64data,
        },
      }),
    };

    // await fetch("http://localhost:9000/testAPI", requestOptions);
    await fetch("https://excaliserve.herokuapp.com/testAPI", requestOptions);
  };
};

export const actionSaveAndClear = register({
  name: "saveAndClear",
  perform: async (elements, appState, value) => {
    try {
      // sends img blob to db
      saveAsImg(elements, {
        ...appState,
        fileHandle: null,
      });
      // returns clean canvas
      return {
        elements: elements.map((element) =>
          newElementWith(element, { isDeleted: true }),
        ),
        appState: {
          ...getDefaultAppState(),
          theme: appState.theme,
          elementLocked: appState.elementLocked,
          exportBackground: appState.exportBackground,
          exportEmbedScene: appState.exportEmbedScene,
          gridSize: appState.gridSize,
          showStats: appState.showStats,
          pasteDialog: appState.pasteDialog,
          // fileHandle,  // does not show the saved file in the canvas
        },
        commitToHistory: true,
      };
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
      }
      return { commitToHistory: false };
    }
  },
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={saveAndClear}
      title={"Save and Clear"}
      aria-label={"Save and Clear"}
      showAriaLabel={useIsMobile()}
      hidden={!fsSupported}
      // onClick={() => updateData(null)}
      onClick={() => {
        if (
          window.confirm("Are you sure you want to save and clear the sketch?")
        ) {
          updateData(null);
        }
      }}
      data-testid="save-and-clear-button"
    />
  ),
});
