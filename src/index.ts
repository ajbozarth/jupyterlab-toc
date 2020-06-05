// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { IMarkdownViewerTracker } from '@jupyterlab/markdownviewer';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  TableOfContents,
  ITableOfContentsRegistry,
  TableOfContentsRegistry as Registry,
  TableOfContentsRegistry
} from '@jupyterlab/toc';

import {
  createLatexGenerator,
  createNotebookGenerator,
  createMarkdownGenerator,
  createPythonGenerator,
  createRenderedMarkdownGenerator
} from '@jupyterlab/toc/lib/generators';

/**
 * Activates the ToC extension.
 *
 * @private
 * @param app - Jupyter application
 * @param docmanager - document manager
 * @param editorTracker - editor tracker
 * @param labShell - Jupyter lab shell
 * @param restorer - application layout restorer
 * @param markdownViewerTracker - Markdown viewer tracker
 * @param notebookTracker - notebook tracker
 * @param rendermime - rendered MIME registry
 * @returns table of contents registry
 */
async function activateTOC(
  app: JupyterFrontEnd,
  docmanager: IDocumentManager,
  editorTracker: IEditorTracker,
  labShell: ILabShell,
  restorer: ILayoutRestorer,
  markdownViewerTracker: IMarkdownViewerTracker,
  notebookTracker: INotebookTracker,
  rendermime: IRenderMimeRegistry,
  settingRegistry: ISettingRegistry
): Promise<ITableOfContentsRegistry> {
  // Create the ToC widget:
  const toc = new TableOfContents({ docmanager, rendermime });

  // Create the ToC registry:
  const registry = new Registry();

  // Add the ToC to the left area:
  toc.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
  toc.title.caption = 'Table of Contents';
  toc.id = 'table-of-contents';
  labShell.add(toc, 'left', { rank: 700 });

  // Add the ToC widget to the application restorer:
  restorer.add(toc, '@jupyterlab/toc:plugin');

  // Attempt to load plugin settings:
  let settings: ISettingRegistry.ISettings | undefined;
  try {
    settings = await settingRegistry.load('@jupyterlab/toc:plugin');
  } catch (error) {
    console.error(
      `Failed to load settings for the Table of Contents extension.\n\n${error}`
    );
  }

  // Create a notebook generator:
  const notebookGenerator = createNotebookGenerator(
    notebookTracker,
    toc,
    rendermime.sanitizer,
    settings
  );
  registry.add(
    (notebookGenerator as unknown) as TableOfContentsRegistry.IGenerator
  );

  // Create a Markdown generator:
  const markdownGenerator = createMarkdownGenerator(
    editorTracker,
    toc,
    rendermime.sanitizer
  );
  registry.add(
    (markdownGenerator as unknown) as TableOfContentsRegistry.IGenerator
  );

  // Create a rendered Markdown generator:
  const renderedMarkdownGenerator = createRenderedMarkdownGenerator(
    markdownViewerTracker,
    toc,
    rendermime.sanitizer
  );
  registry.add(
    (renderedMarkdownGenerator as unknown) as TableOfContentsRegistry.IGenerator
  );

  // Create a LaTeX generator:
  const latexGenerator = createLatexGenerator(editorTracker);
  registry.add(
    (latexGenerator as unknown) as TableOfContentsRegistry.IGenerator
  );

  // Create a Python generator:
  const pythonGenerator = createPythonGenerator(editorTracker);
  registry.add(
    (pythonGenerator as unknown) as TableOfContentsRegistry.IGenerator
  );

  // Update the ToC when the active widget changes:
  labShell.currentChanged.connect(onConnect);

  return registry;

  /**
   * Callback invoked when the active widget changes.
   *
   * @private
   */
  function onConnect() {
    let widget = app.shell.currentWidget;
    if (!widget) {
      return;
    }
    // @ts-ignore
    let generator = registry.find(widget);
    if (!generator) {
      // If the previously used widget is still available, stick with it.
      // Otherwise, set the current ToC widget to null.
      if (toc.current && toc.current.widget.isDisposed) {
        toc.current = null;
      }
      return;
    }
    // @ts-ignore
    toc.current = { widget, generator };
  }
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const index: JupyterFrontEndPlugin<ITableOfContentsRegistry> = {
  id: '@jupyterlab/toc:plugin',
  autoStart: true,
  provides: ITableOfContentsRegistry,
  requires: [
    IDocumentManager,
    IEditorTracker,
    ILabShell,
    ILayoutRestorer,
    IMarkdownViewerTracker,
    INotebookTracker,
    IRenderMimeRegistry,
    ISettingRegistry
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default index;
