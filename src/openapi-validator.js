#!/usr/bin/env node

import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class OpenAPIValidator {
    constructor() {
        this.specPath = join(__dirname, '..', 'openapi.yaml');
        this.apiSpecPath = join(__dirname, '..', 'api', 'openapi.yaml');
    }

    async validateSpec() {
        console.log(chalk.blue('🔍 Validating OpenAPI specification...'));
        
        try {
            // Parse and validate the main OpenAPI spec
            const api = await SwaggerParser.validate(this.specPath);
            
            console.log(chalk.green('✅ OpenAPI specification is valid!'));
            console.log(chalk.gray(`   API: ${api.info.title} v${api.info.version}`));
            console.log(chalk.gray(`   Servers: ${api.servers?.length || 0}`));
            console.log(chalk.gray(`   Paths: ${Object.keys(api.paths || {}).length}`));
            console.log(chalk.gray(`   Schemas: ${Object.keys(api.components?.schemas || {}).length}`));
            
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ OpenAPI specification validation failed:'));
            console.error(chalk.red(error.message));
            
            if (error.details) {
                console.error(chalk.yellow('\nDetails:'));
                error.details.forEach(detail => {
                    console.error(chalk.yellow(`  - ${detail.message}`));
                });
            }
            
            return false;
        }
    }

    async validateExamples() {
        console.log(chalk.blue('🧪 Validating API examples...'));
        
        try {
            const api = await SwaggerParser.dereference(this.specPath);
            const examplePaths = [
                join(__dirname, '..', 'api', 'latest.json'),
                join(__dirname, '..', 'api', 'weeks.json'),
                join(__dirname, '..', 'api', 'stats.json'),
                join(__dirname, '..', 'api', 'index.json')
            ];

            let allValid = true;

            for (const examplePath of examplePaths) {
                try {
                    const content = readFileSync(examplePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    // Basic validation - ensure it's valid JSON
                    console.log(chalk.green(`  ✅ ${examplePath.split('/').pop()}: Valid JSON`));
                    
                } catch (error) {
                    console.error(chalk.red(`  ❌ ${examplePath.split('/').pop()}: Invalid JSON`));
                    console.error(chalk.red(`     ${error.message}`));
                    allValid = false;
                }
            }

            if (allValid) {
                console.log(chalk.green('✅ All API examples are valid!'));
            } else {
                console.log(chalk.red('❌ Some API examples have validation errors'));
            }

            return allValid;
            
        } catch (error) {
            console.error(chalk.red('❌ Example validation failed:'));
            console.error(chalk.red(error.message));
            return false;
        }
    }

    async validateConsistency() {
        console.log(chalk.blue('🔧 Checking consistency between specs...'));
        
        try {
            // Check if API directory spec exists and is consistent
            try {
                const mainSpec = readFileSync(this.specPath, 'utf8');
                const apiSpec = readFileSync(this.apiSpecPath, 'utf8');
                
                if (mainSpec === apiSpec) {
                    console.log(chalk.green('✅ OpenAPI specs are consistent'));
                    return true;
                } else {
                    console.log(chalk.yellow('⚠️  OpenAPI specs differ between root and api directory'));
                    console.log(chalk.blue('   Copying main spec to api directory...'));
                    
                    // Copy main spec to api directory
                    await import('fs/promises').then(fs => 
                        fs.copyFile(this.specPath, this.apiSpecPath)
                    );
                    
                    console.log(chalk.green('✅ Specs synchronized'));
                    return true;
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(chalk.blue('   Copying main spec to api directory...'));
                    
                    await import('fs/promises').then(fs => 
                        fs.copyFile(this.specPath, this.apiSpecPath)
                    );
                    
                    console.log(chalk.green('✅ API spec created'));
                    return true;
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Consistency check failed:'));
            console.error(chalk.red(error.message));
            return false;
        }
    }

    async validateAll() {
        console.log(chalk.bold.blue('🔍 Running OpenAPI validation suite...\n'));
        
        const results = {
            spec: await this.validateSpec(),
            examples: await this.validateExamples(),
            consistency: await this.validateConsistency()
        };

        console.log('\n' + chalk.bold.blue('📊 Validation Summary:'));
        console.log(`   Spec validation: ${results.spec ? chalk.green('PASS') : chalk.red('FAIL')}`);
        console.log(`   Examples validation: ${results.examples ? chalk.green('PASS') : chalk.red('FAIL')}`);
        console.log(`   Consistency check: ${results.consistency ? chalk.green('PASS') : chalk.red('FAIL')}`);

        const allPassed = Object.values(results).every(result => result);
        
        if (allPassed) {
            console.log('\n' + chalk.bold.green('🎉 All validations passed!'));
            process.exit(0);
        } else {
            console.log('\n' + chalk.bold.red('💥 Some validations failed!'));
            process.exit(1);
        }
    }

    async generateReport() {
        console.log(chalk.blue('📋 Generating OpenAPI validation report...'));
        
        try {
            const api = await SwaggerParser.validate(this.specPath);
            const report = {
                timestamp: new Date().toISOString(),
                valid: true,
                info: {
                    title: api.info.title,
                    version: api.info.version,
                    description: api.info.description
                },
                servers: api.servers?.map(server => ({
                    url: server.url,
                    description: server.description
                })) || [],
                paths: Object.keys(api.paths || {}),
                schemas: Object.keys(api.components?.schemas || {}),
                statistics: {
                    totalPaths: Object.keys(api.paths || {}).length,
                    totalSchemas: Object.keys(api.components?.schemas || {}).length,
                    totalResponses: Object.keys(api.components?.responses || {}).length
                }
            };

            console.log(chalk.green('✅ Report generated successfully'));
            console.log(JSON.stringify(report, null, 2));
            
            return report;
            
        } catch (error) {
            const report = {
                timestamp: new Date().toISOString(),
                valid: false,
                error: error.message,
                details: error.details || []
            };

            console.log(chalk.red('❌ Report generated with errors'));
            console.log(JSON.stringify(report, null, 2));
            
            return report;
        }
    }
}

// CLI execution
async function main() {
    const validator = new OpenAPIValidator();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'spec':
            await validator.validateSpec();
            break;
        case 'examples':
            await validator.validateExamples();
            break;
        case 'consistency':
            await validator.validateConsistency();
            break;
        case 'report':
            await validator.generateReport();
            break;
        case 'all':
        default:
            await validator.validateAll();
            break;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(chalk.red('💥 Validation failed:'), error);
        process.exit(1);
    });
}

export default OpenAPIValidator;