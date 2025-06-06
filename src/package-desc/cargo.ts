/*
 * @Author: Your Name
 * @Date: 2025-06-05 18:10:00
 * @Description: Cargo package descriptor implementation for Rust crates
 */
import { BasePackageDescriptor, cacheable, PackageDetails } from './baseDescriptor';
import axios from 'axios';

export default class CargoPackageDescriptor extends BasePackageDescriptor {
  protected isDependencyLine(line: string): boolean {
    // Matches both [dependencies] and [dev-dependencies] sections
    return /^\s*([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/.test(line) || /^\s*([a-zA-Z0-9_-]+)\s*=\s*\{\s*version\s*=\s*["']([^"']+)["']/.test(line);
  }

  protected extractPackageInfo(line: string): { name: string; version: string } | null {
    // Handle both simple and complex dependency declarations
    const simpleMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
    const complexMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*\{\s*version\s*=\s*["']([^"']+)["']/);

    const match = simpleMatch || complexMatch;
    if (!match) return null;

    return {
      name: match[1],
      version: match[2].replace(/^\^|~|=/, ''), // Remove version specifiers
    };
  }

  @cacheable
  protected async fetchPackageDetails(packageName: string): Promise<PackageDetails | null> {
    try {
      const response = await axios.get(`${this.registryUrl}${packageName}`, {
        timeout: 20000,
      });
      const data = response.data;

      // Crates.io API returns the crate info directly
      const crate = data.crate || data;
      const latestVersion = crate.newest_version || (crate.versions && crate.versions[0]?.num);

      return {
        name: packageName,
        latestVersion,
        description: crate.description,
        license: crate.license,
        repository: crate.repository,
      };
    } catch (error) {
      console.debug(`Failed to fetch Rust crate info for ${packageName}:`, error);
      return null;
    }
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.cargoRegistryUrl || 'https://crates.io';
    return `${registryUrl}/api/v1/crates/`;
  }
}
