/*
 * @Author: Your Name
 * @Date: 2023-06-20
 * @Description: Podfile hover provider for CocoaPods dependencies
 */
import { BasePackageDescriptor, cacheable, PackageDetails } from './baseDescriptor';
import axios from 'axios';

export default class PodfilePackageDescriptor extends BasePackageDescriptor {
  // Match pod declaration lines (supports various syntax formats)
  protected isDependencyLine(line: string): boolean {
    return /^\s*pod\s+['"]([^'"]+)['"]/.test(line) || /^\s*pod\s+['"][^'"]+['"]\s*,\s*['"][^'"]+['"]/.test(line);
  }

  // Extract pod name and version from different declaration formats
  protected extractPackageInfo(line: string): { name: string; version: string } | null {
    const simpleMatch = line.match(/^\s*pod\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
    if (!simpleMatch) return null;

    return {
      name: simpleMatch[1],
      version: simpleMatch[2]?.replace(/^~>|>=|<=|>|<|=/, '') || 'latest', // Normalize version specifiers
    };
  }

  @cacheable
  protected async fetchPackageDetails(podName: string): Promise<PackageDetails | null> {
    try {
      const response = await axios.get(`${this.registryUrl}${podName}`, {
        timeout: 20000,
      });

      const podData = response.data;
      const latestVersion = Array.isArray(podData.versions) && podData.versions[podData.versions.length - 1].name;

      return {
        name: podName,
        latestVersion,
        description: podData.description || podData.summary,
        license: podData.license?.type || podData.license,
        repository: this.extractRepoUrl(podData),
      };
    } catch (error) {
      console.debug(`Failed to fetch CocoaPod info for ${podName}:`, error);
      return null;
    }
  }

  // Extract repository URL from various possible fields
  private extractRepoUrl(podData: any): string | undefined {
    return podData.source?.git || (podData.homepage?.match(/github\.com/) && podData.homepage) || podData.source_url;
  }

  // Get CocoaPods API URL (can be configured)
  protected get registryUrl() {
    return this.configSection.cocoapodsRegistryUrl || 'https://trunk.cocoapods.org/api/v1/pods/';
  }
}
