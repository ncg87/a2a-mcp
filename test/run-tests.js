#!/usr/bin/env node

/**
 * Unified Test Runner
 * 
 * Organizes and runs all test files from the test directory
 * Replaces individual test files scattered in root
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.testCategories = {
      unit: 'Unit Tests',
      integration: 'Integration Tests', 
      e2e: 'End-to-End Tests',
      manual: 'Manual Test Scripts'
    };
  }

  async displayMenu() {
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('║') + chalk.white('              🧪 UNIFIED TEST RUNNER 🧪                  ') + chalk.cyan('║'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log();
    console.log(chalk.yellow('Select test category:'));
    console.log(chalk.gray('1. ') + chalk.white('Unit Tests (Jest)'));
    console.log(chalk.gray('2. ') + chalk.white('Integration Tests'));
    console.log(chalk.gray('3. ') + chalk.white('End-to-End Tests'));
    console.log(chalk.gray('4. ') + chalk.white('Manual Test Scripts'));
    console.log(chalk.gray('5. ') + chalk.white('Run All Tests'));
    console.log(chalk.gray('6. ') + chalk.white('List Available Tests'));
    console.log(chalk.gray('0. ') + chalk.white('Exit'));
    console.log();
  }

  async runUnitTests() {
    console.log(chalk.cyan('\n🧪 Running Unit Tests...'));
    await this.executeCommand('npm', ['test'], { cwd: path.join(__dirname, '..') });
  }

  async runIntegrationTests() {
    console.log(chalk.cyan('\n🔗 Running Integration Tests...'));
    const files = await this.getTestFiles('integration');
    for (const file of files) {
      console.log(chalk.gray(`Running: ${file}`));
      await this.executeCommand('node', [path.join(__dirname, 'integration', file)]);
    }
  }

  async runE2ETests() {
    console.log(chalk.cyan('\n🚀 Running End-to-End Tests...'));
    const files = await this.getTestFiles('e2e');
    for (const file of files) {
      console.log(chalk.gray(`Running: ${file}`));
      await this.executeCommand('node', [path.join(__dirname, 'e2e', file)]);
    }
  }

  async runManualTests() {
    console.log(chalk.cyan('\n🖱️ Available Manual Tests:'));
    const files = await this.getTestFiles('manual');
    
    files.forEach((file, index) => {
      console.log(chalk.gray(`${index + 1}. `) + chalk.white(file));
    });
    
    console.log(chalk.yellow('\nRun specific test with: node test/manual/<filename>'));
  }

  async listAllTests() {
    console.log(chalk.cyan('\n📋 All Available Tests:'));
    
    for (const [dir, title] of Object.entries(this.testCategories)) {
      console.log(chalk.yellow(`\n${title}:`));
      const files = await this.getTestFiles(dir);
      
      if (files.length === 0) {
        console.log(chalk.gray('  No tests found'));
      } else {
        files.forEach(file => {
          console.log(chalk.gray('  - ') + chalk.white(file));
        });
      }
    }
  }

  async getTestFiles(directory) {
    try {
      const dirPath = path.join(__dirname, directory);
      const files = await fs.readdir(dirPath);
      return files.filter(file => file.endsWith('.js') || file.endsWith('.test.js'));
    } catch (error) {
      return [];
    }
  }

  executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  async run() {
    await this.displayMenu();
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(chalk.cyan('Select option: '), async (answer) => {
      console.log();
      
      try {
        switch (answer) {
          case '1':
            await this.runUnitTests();
            break;
          case '2':
            await this.runIntegrationTests();
            break;
          case '3':
            await this.runE2ETests();
            break;
          case '4':
            await this.runManualTests();
            break;
          case '5':
            console.log(chalk.cyan('🎯 Running All Tests...'));
            await this.runUnitTests();
            await this.runIntegrationTests();
            await this.runE2ETests();
            console.log(chalk.green('\n✅ All tests completed!'));
            break;
          case '6':
            await this.listAllTests();
            break;
          case '0':
            console.log(chalk.gray('Goodbye!'));
            break;
          default:
            console.log(chalk.red('Invalid option'));
        }
      } catch (error) {
        console.error(chalk.red('Test execution failed:'), error.message);
      }
      
      rl.close();
      process.exit(0);
    });
  }
}

// Run the test runner
const runner = new TestRunner();
runner.run().catch(console.error);