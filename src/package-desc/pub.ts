/*
 * @Author: zdd
 * @Date: 2025-06-05 18:10:00
 * @Description: Dart包描述信息实现
 */
import { BasePackageDescriptor, cacheable, PackageDetails } from './baseDescriptor';
import axios from 'axios';

export default class PubPackageDescriptor extends BasePackageDescriptor {
  protected isDependencyLine(line: string): boolean {
    return /^\s*([a-z0-9_]+):\s*([^#\s]+)/.test(line);
  }

  protected extractPackageInfo(line: string): { name: string; version: string } | null {
    const match = line.match(/^\s*([a-z0-9_]+):\s*([^#\s]+)/);
    if (!match) return null;
    return {
      name: match[1],
      version: match[2].replace(/["']/g, '').replace(/^\^/, ''),
    };
  }

  @cacheable
  protected async fetchPackageDetails(packageName: string): Promise<PackageDetails | null> {
    try {
      const response = await axios.get(`${this.registryUrl}${packageName}`, { timeout: 20000 });
      const data = response.data;

      let repository = data.latest?.pubspec?.repository;
      const homepage = data.latest?.pubspec?.homepage;
      if (!repository && homepage?.includes('github.com')) repository = homepage;

      return {
        name: packageName,
        latestVersion: data.latest?.version,
        description: data.latest?.pubspec?.description,
        license: data.latest?.pubspec?.license,
        repository,
      };
    } catch (error) {
      console.debug(`Failed to fetch Dart package info for ${packageName}:`, error);
      return null;
    }
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.dartRegistryUrl || 'https://pub.dev/';
    return `${registryUrl}api/packages/`;
  }
}
