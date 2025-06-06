/*
 * @Author: Your Name
 * @Date: 2025-06-05 18:10:00
 * @Description: Gradle package descriptor implementation using Maven Search API
 */
import { BasePackageDescriptor, cacheable, PackageDetails } from './baseDescriptor';
import axios from 'axios';

export default class GradlePackageDescriptor extends BasePackageDescriptor {
  protected isDependencyLine(line: string): boolean {
    // Matches Gradle dependency declarations in various formats:
    // - implementation 'group:name:version'
    // - testImplementation "group:name:version"
    // - implementation(group: 'group', name: 'name', version: 'version')
    return (
      /^\s*(implementation|testImplementation|compileOnly|runtimeOnly|api|kapt|classpath)\s+['"]([^:]+:[^:]+:[^'"]+)['"]/.test(line) ||
      /^\s*(implementation|testImplementation|compileOnly|runtimeOnly|api|kapt|classpath)\(.*name\s*[:=]\s*['"]([^'"]+)['"]/.test(line)
    );
  }

  protected extractPackageInfo(line: string): { name: string; version: string } | null {
    // Handle short format: implementation 'group:name:version'
    const shortFormatMatch = line.match(/^\s*\w+\s+['"]([^:]+):([^:]+):([^'"]+)['"]/);
    if (shortFormatMatch) {
      return {
        name: `${shortFormatMatch[1]}:${shortFormatMatch[2]}`, // group:name format
        version: shortFormatMatch[3],
      };
    }

    // Handle long format: implementation(group: 'group', name: 'name', version: 'version')
    const groupMatch = line.match(/group\s*[:=]\s*['"]([^'"]+)['"]/);
    const nameMatch = line.match(/name\s*[:=]\s*['"]([^'"]+)['"]/);
    const versionMatch = line.match(/version\s*[:=]\s*['"]([^'"]+)['"]/);

    if (groupMatch && nameMatch && versionMatch) {
      return {
        name: `${groupMatch[1]}:${nameMatch[1]}`,
        version: versionMatch[1],
      };
    }

    return null;
  }

  @cacheable
  protected async fetchPackageDetails(packageName: string): Promise<PackageDetails | null> {
    try {
      // Split package name into group and artifact
      const [group, artifact] = packageName.split(':');
      if (!group || !artifact) {
        return null;
      }

      // Use Maven Search API
      const searchUrl = `${this.searchApiUrl}?q=g:"${encodeURIComponent(group)}"+AND+a:"${encodeURIComponent(artifact)}"&core=gav&rows=1&wt=json`;
      const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          Accept: 'application/json',
        },
      });

      const data = response.data;

      // Check for results
      if (data.response?.numFound === 0) {
        return null;
      }

      const latestVersion = data.response?.docs?.[0]?.v;
      if (!latestVersion) {
        return null;
      }

      // Get additional details from the search API
      const detailUrl = `${this.searchApiUrl}?q=g:"${encodeURIComponent(group)}"+AND+a:"${encodeURIComponent(artifact)}"&core=artifact&rows=1&wt=json`;
      const detailResponse = await axios.get(detailUrl, {
        timeout: 15000,
      });

      const detailData = detailResponse.data;
      const firstDoc = detailData.response?.docs?.[0];

      return {
        name: packageName,
        latestVersion,
        description: firstDoc?.description || '',
        license: firstDoc?.license?.[0] || '',
        repository: 'Maven Central',
      };
    } catch (error) {
      console.debug(`Failed to fetch package info from Maven Search API for ${packageName}:`, error);

      // Fallback to Gradle Plugin Portal for Gradle plugins
      if (packageName.startsWith('org.gradle.')) {
        try {
          const gradleResponse = await axios.get(`https://plugins.gradle.org/m2/${packageName.replace(/\./g, '/')}/maven-metadata.xml`, {
            timeout: 15000,
          });
          const gradleXmlData = gradleResponse.data;
          const gradleVersion = gradleXmlData.match(/<latest>([^<]+)<\/latest>/) || gradleXmlData.match(/<version>([^<]+)<\/version>/g);

          if (gradleVersion) {
            return {
              name: packageName,
              latestVersion: Array.isArray(gradleVersion) ? gradleVersion[0].replace(/<\/?version>/g, '') : gradleVersion[1],
              description: 'Gradle plugin',
              repository: 'Gradle Plugin Portal',
            };
          }
        } catch (gradleError) {
          console.debug(`Failed to fetch Gradle plugin info for ${packageName}:`, gradleError);
        }
      }

      return null;
    }
  }

  protected get searchApiUrl() {
    return this.configSection.mavenSearchApiUrl || 'https://search.maven.org/solrsearch/select';
  }

  protected get registryUrl() {
    return this.configSection.gradleRegistryUrl || 'https://repo1.maven.org/maven2/';
  }
}
