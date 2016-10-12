const vscode = require("vscode");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(p_context)
{
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Congratulations, your extension 'syncing' is now active!");

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand("syncing.uploadSettings", () =>
    {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage("Hello Jackasdads !");
    });

    p_context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate()
{
}

module.exports.activate = activate;
module.exports.deactivate = deactivate;
