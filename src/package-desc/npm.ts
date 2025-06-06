/*
 * @Author: zdd
 * @Date: 2025-06-03 13:48:20
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-06 11:13:05
 * @FilePath: npm.ts
 */
import { BasePackageDescriptor, cacheable, PackageDetails } from './baseDescriptor';
import axios from 'axios';

export default class NpmPackageDescriptor extends BasePackageDescriptor {
  protected isDependencyLine(line: string): boolean {
    return /"(.*?)":\s*"[\^~]?[\d.]+"/.test(line);
  }

  protected extractPackageInfo(line: string): { name: string; version: string } | null {
    const match = line.match(/"(.*?)":\s*"([\^~]?[\d.]+)"/);
    if (!match) return null;
    return {
      name: match[1],
      version: match[2].replace(/[\^~]/, ''),
    };
  }

  @cacheable
  protected async fetchPackageDetails(packageName: string): Promise<PackageDetails | null> {
    try {
      const response = await axios.get(`${this.registryUrl}${packageName}/latest`, { timeout: 20000 });
      const data = response.data;

      return {
        name: packageName,
        latestVersion: data.version,
        description: data.description,
        license: data.license,
        repository: data.repository?.url?.replace(/git\+|\.git/g, ''),
      };
    } catch (error) {
      console.debug(`Failed to fetch npm package info for ${packageName}:`, error);
      return null;
    }
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.npmRegistryUrl || 'https://www.npmjs.com/';
    return registryUrl.replace('www', 'registry');
  }
}
