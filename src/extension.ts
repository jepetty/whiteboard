import * as fs from "fs";
import * as vscode from "vscode";
import * as vsls from "vsls";

import createWebView from "./webView";
import registerTreeDataProvider from "./treeDataProvider";

export async function activate(context: vscode.ExtensionContext) {
  const vslsApi = await vsls.getApi();
  registerTreeDataProvider(vslsApi!);

  let webView: vscode.WebviewPanel;
  context.subscriptions.push(
    vscode.commands.registerCommand("liveshare.openWhiteboard", async () => {
      if (webView) {
        return webView.reveal();
      } else {
        webView = createWebView(context);
      }

      let { default: initializeService } =
        vslsApi!.session.role === vsls.Role.Host
          ? require("./service/hostService")
          : require("./service/guestService");

      await initializeService(vslsApi, webView.webview);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("liveshare.saveWhiteboard", async () => {
      if (webView) {
        const uri = await vscode.window.showSaveDialog({
          filters: {
            SVG: ["svg"]
          }
        });
        if (!uri) return;

        webView.webview.onDidReceiveMessage(({ command, data }) => {
          if (command === "snapshotSVGResponse") {
            fs.writeFileSync(uri.toString().replace("file://", ""), data);
          }
        });
        await webView.webview.postMessage({ command: "getSnapshotSVG" });
      }
    })
  );
}