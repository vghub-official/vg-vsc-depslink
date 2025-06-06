/*
 * @Author: zdd
 * @Date: 2023-05-30 17:42:04
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-06 10:38:37
 * @FilePath: extension.ts
 * @Description:
 */
import * as vscode from 'vscode';
import NpmDependencyLinkProvider from './package-link/npm';
import PubDependencyLinkProvider from './package-link/pub';
import GradleDependencyLinkProvider from './package-link/gradle';
import PodfileDependencyLinkProvider from './package-link/podfile';
import GoDependencyLinkProvider from './package-link/go';
import CargoDependencyLinker from './package-link/cargo';
import NpmPackageDescriptor from './package-desc/npm';
import PubPackageDescriptor from './package-desc/pub';
import CargoPackageDescriptor from './package-desc/cargo';
import GoModPackageDescriptor from './package-desc/go';
import GradlePackageDescriptor from './package-desc/gradle';
import PodfilePackageDescriptor from './package-desc/podfile';

export function activate(context: vscode.ExtensionContext) {
  console.log('恭喜，您的扩展“Vg Deplinks”已被激活！');

  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(['javascript', { pattern: '**/package.json' }], new NpmDependencyLinkProvider()),
    vscode.languages.registerDocumentLinkProvider(['yaml', { pattern: '**/pubspec.yaml' }], new PubDependencyLinkProvider()),
    vscode.languages.registerDocumentLinkProvider(['gradle', { pattern: '**/build.gradle' }], new GradleDependencyLinkProvider()),
    vscode.languages.registerDocumentLinkProvider(['ruby', { pattern: '**/Podfile' }], new PodfileDependencyLinkProvider()),
    vscode.languages.registerDocumentLinkProvider(['go', { pattern: '**/go.mod' }], new GoDependencyLinkProvider()),
    vscode.languages.registerDocumentLinkProvider(['toml', { pattern: '**/Cargo.toml' }], new CargoDependencyLinker()),
    vscode.languages.registerHoverProvider(['gradle', { pattern: '**/build.gradle' }], new GradlePackageDescriptor()),
    vscode.languages.registerHoverProvider(['go', { pattern: '**/go.mod' }], new GoModPackageDescriptor()),
    vscode.languages.registerHoverProvider(['ruby', { pattern: '**/Podfile' }], new PodfilePackageDescriptor()),
    vscode.languages.registerHoverProvider(['toml', { pattern: '**/Cargo.toml' }], new CargoPackageDescriptor()),
    vscode.languages.registerHoverProvider(['javascript', { pattern: '**/package.json' }], new NpmPackageDescriptor()),
    vscode.languages.registerHoverProvider(['yaml', { pattern: '**/pubspec.yaml' }], new PubPackageDescriptor())
  );

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
  statusBarItem.command = 'extension.deplinkView';
  statusBarItem.text = '$(smiley) VG deplink';
  statusBarItem.tooltip = '';
  statusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log('您的扩展“vg-vscode-extension”已被释放！');
}
