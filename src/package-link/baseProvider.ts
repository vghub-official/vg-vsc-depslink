/*
 * @Author: zdd dongdong@grizzlychina.com
 * @Date: 2025-06-03 20:40:11
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-06 11:08:25
 * @FilePath: baseProvider.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { DocumentLink, DocumentLinkProvider, Range, TextDocument, TextLine, Uri, workspace, WorkspaceConfiguration } from 'vscode';

export abstract class BaseDependencyLinkProvider implements DocumentLinkProvider {
  /**
   * Get the configuration section for this dependency link provider.
   *
   * @returns The configuration section.
   */
  protected getConfigSection() {
    return 'depslink';
  }

  protected get configSection(): WorkspaceConfiguration {
    return workspace.getConfiguration(this.getConfigSection());
  }

  /**
   * Check if the line is the start of the dependencies block.
   *
   * @param line The line to check.
   * @returns True if the line is the start of the dependencies block, false otherwise.
   */
  protected isDependenciesBlockStart(line: TextLine): boolean {
    return true;
  }

  /**
   * Check if the line is the end of the dependencies block.
   *
   * @param line The line to check.
   * @returns True if the line is the end of the dependencies block, false otherwise.
   */
  protected isDependenciesBlockEnd(line: TextLine): boolean {
    return false;
  }

  /**
   * Extract the package name from the line.
   *
   * @param line The line to extract the package name from.
   * @returns The package name or null if not found.
   */
  protected abstract extractPackageName(line: TextLine): string[] | string | null;

  /**
   * Get the URL pattern for the registry.
   *
   * @returns The URL pattern.
   */
  protected get registryUrlPattern(): string {
    return '';
  }

  /**
   * Get the URL for the registry.
   *
   * @returns The URL.
   */
  protected abstract get registryUrl(): string;

  /**
   * Build the link plugin for the document link.
   *
   * @returns The document link or null if not found.
   */
  protected buildLinkPlugin(linkRange: Range, dependency: string, lineText: string): DocumentLink | null {
    return null;
  }

  protected localDep(lineText: string): boolean {
    return false;
  }

  protected buildLink(line: TextLine, lineIndex: number, packageName: string): DocumentLink | null {
    const startCharacter = line.text.indexOf(packageName);
    if (startCharacter === -1) return null;
    const endCharacter = startCharacter + packageName.length;
    const linkRange = new Range(lineIndex, startCharacter, lineIndex, endCharacter);

    const link = this.buildLinkPlugin(linkRange, packageName, line.text);
    if (link) return link;

    const isLocalDep = this.localDep(line.text);
    if (isLocalDep) return null;

    if (this.shouldUseUrlPattern()) {
      const registryUrl = this.registryUrlPattern.replace('{{pkg}}', packageName);
      return new DocumentLink(linkRange, Uri.parse(registryUrl));
    }

    const registryUrl = this.registryUrl;
    return new DocumentLink(linkRange, Uri.parse(`${registryUrl}${packageName}`));
  }

  protected shouldUseUrlPattern(): boolean {
    return !!this.registryUrlPattern;
  }

  provideDocumentLinks(document: TextDocument) {
    const links: DocumentLink[] = [];
    let inDependencyBlock = false;

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);

      if (inDependencyBlock) {
        if (this.isDependenciesBlockEnd(line)) {
          inDependencyBlock = false;
        } else {
          const packageName = this.extractPackageName(line);

          if (packageName && typeof packageName === 'string') {
            const link = this.buildLink(line, lineIndex, packageName);
            if (link) links.push(link);
          } else if (packageName && Array.isArray(packageName)) {
            packageName.forEach((name) => {
              const link = this.buildLink(line, lineIndex, name);
              if (link) links.push(link);
            });
          }
        }
      } else if (this.isDependenciesBlockStart(line)) {
        inDependencyBlock = true;
      }
    }

    return links;
  }
}
