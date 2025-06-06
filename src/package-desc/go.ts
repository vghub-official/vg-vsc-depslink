/*
 * @Author: Your Name
 * @Date: 2023-06-20
 * @Description: Go.mod hover provider for Go module dependencies
 */
import { BasePackageDescriptor, cacheable, PackageDetails } from './baseDescriptor';
import axios from 'axios';

export default class GoModPackageDescriptor extends BasePackageDescriptor {
  // Match require statements and go directive
  protected isDependencyLine(line: string): boolean {
    return /^\s*(require\s+)?([^\s]+)\s+([^\s]+)/.test(line) || /^\s*go\s+([^\s]+)/.test(line);
  }

  // Extract module path and version
  protected extractPackageInfo(line: string): { name: string; version: string } | null {
    // Handle require statements
    const requireMatch = line.match(/^\s*(?:require\s+)?([^\s]+)\s+([^\s]+)/);
    if (requireMatch) {
      return {
        name: requireMatch[1],
        version: requireMatch[2].replace(/^v/, ''), // Remove 'v' prefix from versions
      };
    }

    // Handle go directive
    const goMatch = line.match(/^\s*go\s+([^\s]+)/);
    if (goMatch) {
      return {
        name: 'go',
        version: goMatch[1],
      };
    }

    return null;
  }

  @cacheable
  protected async fetchPackageDetails(modulePath: string): Promise<PackageDetails | null> {
    try {
      // Try to get more details from pkg.go.dev
      let pkgDetails: Partial<PackageDetails> = {};
      try {
        const pkgResponse = await axios.get(`https://pkg.go.dev/${modulePath}`, {
          timeout: 10000,
        });
        const htmlString = pkgResponse.data;
        // 提取版本号 (从 Version: v1.30.0)
        const versionMatch = htmlString.match(/Version:[\s\n\r\t]*<\/span>[\s\n\r\t]*v([\d.]+)/);
        const latestVersion = versionMatch ? versionMatch[1] : null;
        if (latestVersion) pkgDetails.latestVersion = latestVersion;
        // 提取许可证 (从 License: MIT)
        const licenseMatch = htmlString.match(/License: <[^>]+>([^<]+)</);
        const license = licenseMatch ? licenseMatch[1].trim() : null;
        if (license) pkgDetails.license = license;
      } catch (e) {
        console.debug(`Failed to fetch pkg.go.dev details for ${modulePath}:`, e);
      }

      return {
        name: modulePath,
        ...pkgDetails,
      };
    } catch (error) {
      console.debug(`Failed to fetch Go module info for ${modulePath}:`, error);
      return this.fallbackGitHubSearch(modulePath);
    }
  }

  // Compare semantic versions
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.');
    const partsB = b.split('.');

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = parseInt(partsA[i] || '0', 10);
      const numB = parseInt(partsB[i] || '0', 10);

      if (numA > numB) return -1;
      if (numA < numB) return 1;
    }

    return 0;
  }

  // Fallback to GitHub search
  private async fallbackGitHubSearch(modulePath: string): Promise<PackageDetails | null> {
    try {
      // Extract probable repo path (for common Go module paths)
      const repoPath = modulePath
        .replace(/^golang\.org\/x\//, 'github.com/golang/')
        .replace(/^google\.golang\.org\/api/, 'github.com/googleapis/google-api-go-client')
        .replace(/^cloud\.google\.com\/go/, 'github.com/googleapis/google-cloud-go');

      if (repoPath.startsWith('github.com/')) {
        const response = await axios.get(`https://api.github.com/repos/${repoPath.split('/').slice(1, 3).join('/')}`, {
          timeout: 8000,
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Go-Hover-Provider',
          },
        });

        return {
          name: modulePath,
          latestVersion: 'unknown',
          repository: response.data.html_url,
          description: response.data.description,
          license: response.data.license?.spdx_id,
        };
      }
    } catch (e) {
      console.debug(`GitHub fallback failed for ${modulePath}:`, e);
    }
    return null;
  }

  protected get registryUrl() {
    return this.configSection.goProxy || 'https://proxy.golang.org';
  }
}
