#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Esquema de validación para datos de reunión
 */
const MEETING_SCHEMA = {
  required: ['id', 'weekStartDate', 'weekEndDate', 'weekOf', 'year', 'weekNumber', 'meetings'],
  properties: {
    id: { type: 'string', pattern: /^week-\d{4}-\d{1,2}$/ },
    weekStartDate: { type: 'string', format: 'iso-date' },
    weekEndDate: { type: 'string', format: 'iso-date' },
    weekOf: { type: 'string' },
    year: { type: 'number', min: 2020, max: 2030 },
    weekNumber: { type: 'number', min: 1, max: 53 },
    meetings: { 
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: {
        required: ['type', 'title', 'sections', 'materials'],
        properties: {
          type: { type: 'string', enum: ['midweek', 'weekend'] },
          title: { type: 'string', minLength: 1 },
          sections: { type: 'array' },
          materials: {
            type: 'object',
            required: ['videos', 'images', 'audio', 'songs'],
            properties: {
              videos: { type: 'array' },
              images: { type: 'array' },
              audio: { type: 'array' },
              songs: { type: 'array' }
            }
          }
        }
      }
    }
  }
};

/**
 * Validar un valor contra un esquema
 */
function validateValue(value, schema, path = '') {
  const errors = [];

  // Validar tipo
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
      return errors; // No continuar si el tipo es incorrecto
    }
  }

  // Validar formato de fecha ISO
  if (schema.format === 'iso-date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      errors.push(`${path}: Invalid ISO date format`);
    }
  }

  // Validar patrón regex
  if (schema.pattern && typeof value === 'string') {
    if (!schema.pattern.test(value)) {
      errors.push(`${path}: Does not match required pattern`);
    }
  }

  // Validar longitud mínima
  if (schema.minLength && typeof value === 'string') {
    if (value.length < schema.minLength) {
      errors.push(`${path}: Length is less than ${schema.minLength}`);
    }
  }

  // Validar rango numérico
  if (schema.min && typeof value === 'number') {
    if (value < schema.min) {
      errors.push(`${path}: Value ${value} is less than minimum ${schema.min}`);
    }
  }

  if (schema.max && typeof value === 'number') {
    if (value > schema.max) {
      errors.push(`${path}: Value ${value} is greater than maximum ${schema.max}`);
    }
  }

  // Validar enum
  if (schema.enum && Array.isArray(schema.enum)) {
    if (!schema.enum.includes(value)) {
      errors.push(`${path}: Value "${value}" is not in allowed values: ${schema.enum.join(', ')}`);
    }
  }

  // Validar array
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`${path}: Array has ${value.length} items, minimum is ${schema.minItems}`);
    }
    if (schema.maxItems && value.length > schema.maxItems) {
      errors.push(`${path}: Array has ${value.length} items, maximum is ${schema.maxItems}`);
    }

    // Validar elementos del array
    if (schema.items) {
      value.forEach((item, index) => {
        const itemErrors = validateObject(item, schema.items, `${path}[${index}]`);
        errors.push(...itemErrors);
      });
    }
  }

  // Validar objeto
  if (schema.type === 'object' && typeof value === 'object' && value !== null) {
    const objectErrors = validateObject(value, schema, path);
    errors.push(...objectErrors);
  }

  return errors;
}

/**
 * Validar un objeto contra un esquema
 */
function validateObject(obj, schema, basePath = '') {
  const errors = [];

  // Verificar propiedades requeridas
  if (schema.required) {
    for (const requiredProp of schema.required) {
      if (!(requiredProp in obj)) {
        errors.push(`${basePath}.${requiredProp}: Required property is missing`);
      }
    }
  }

  // Validar propiedades existentes
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in obj) {
        const propPath = basePath ? `${basePath}.${propName}` : propName;
        const propErrors = validateValue(obj[propName], propSchema, propPath);
        errors.push(...propErrors);
      }
    }
  }

  return errors;
}

/**
 * Validar estructura de datos de reunión
 */
function validateMeetingData(data) {
  const errors = validateObject(data, MEETING_SCHEMA);
  
  // Validaciones adicionales específicas del dominio
  
  // Verificar que las fechas sean consistentes
  if (data.weekStartDate && data.weekEndDate) {
    const startDate = new Date(data.weekStartDate);
    const endDate = new Date(data.weekEndDate);
    
    if (endDate <= startDate) {
      errors.push('weekEndDate must be after weekStartDate');
    }
    
    const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff !== 6) {
      errors.push(`Week should span 7 days, but spans ${daysDiff + 1} days`);
    }
  }
  
  // Verificar que no haya tipos de reunión duplicados
  if (data.meetings) {
    const meetingTypes = data.meetings.map(m => m.type);
    const uniqueTypes = new Set(meetingTypes);
    if (meetingTypes.length !== uniqueTypes.size) {
      errors.push('Duplicate meeting types found');
    }
  }
  
  // Validar URLs si existen
  if (data.meetings) {
    data.meetings.forEach((meeting, index) => {
      if (meeting.materials) {
        ['videos', 'images', 'audio'].forEach(mediaType => {
          if (meeting.materials[mediaType]) {
            meeting.materials[mediaType].forEach((item, itemIndex) => {
              if (item.url && !isValidUrl(item.url)) {
                errors.push(`meetings[${index}].materials.${mediaType}[${itemIndex}].url: Invalid URL format`);
              }
            });
          }
        });
      }
    });
  }
  
  return errors;
}

/**
 * Validar formato de URL
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Validar un archivo específico
 */
async function validateFile(filePath) {
  const spinner = ora(`Validando ${path.basename(filePath)}`).start();
  
  try {
    if (!await fs.pathExists(filePath)) {
      spinner.fail(`Archivo no encontrado: ${filePath}`);
      return { valid: false, errors: ['File not found'] };
    }
    
    const data = await fs.readJson(filePath);
    const errors = validateMeetingData(data);
    
    if (errors.length === 0) {
      spinner.succeed(`✅ ${path.basename(filePath)} es válido`);
      return { valid: true, errors: [] };
    } else {
      spinner.fail(`❌ ${path.basename(filePath)} tiene errores`);
      return { valid: false, errors };
    }
    
  } catch (error) {
    spinner.fail(`Error leyendo archivo: ${error.message}`);
    return { valid: false, errors: [error.message] };
  }
}

/**
 * Validar todos los archivos en el directorio de datos
 */
async function validateAllFiles(dataDir = './data') {
  console.log(chalk.blue('🔍 Validando archivos de datos...'));
  
  if (!await fs.pathExists(dataDir)) {
    console.log(chalk.red(`❌ Directorio de datos no encontrado: ${dataDir}`));
    return false;
  }
  
  const results = [];
  let totalErrors = 0;
  
  // Buscar archivos JSON recursivamente
  const findJsonFiles = async (dir) => {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const subFiles = await findJsonFiles(itemPath);
        files.push(...subFiles);
      } else if (item.endsWith('.json')) {
        files.push(itemPath);
      }
    }
    
    return files;
  };
  
  const jsonFiles = await findJsonFiles(dataDir);
  
  if (jsonFiles.length === 0) {
    console.log(chalk.yellow('⚠️  No se encontraron archivos JSON para validar'));
    return true;
  }
  
  console.log(chalk.gray(`Encontrados ${jsonFiles.length} archivos para validar\n`));
  
  // Validar cada archivo
  for (const filePath of jsonFiles) {
    const result = await validateFile(filePath);
    results.push({ file: filePath, ...result });
    
    if (!result.valid) {
      totalErrors += result.errors.length;
      console.log(chalk.red(`\n📄 Errores en ${path.basename(filePath)}:`));
      result.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
  }
  
  // Resumen final
  console.log(chalk.blue('\n📊 Resumen de validación:'));
  console.log(chalk.gray(`  Total archivos: ${jsonFiles.length}`));
  console.log(chalk.green(`  Válidos: ${results.filter(r => r.valid).length}`));
  console.log(chalk.red(`  Con errores: ${results.filter(r => !r.valid).length}`));
  console.log(chalk.red(`  Total errores: ${totalErrors}`));
  
  const allValid = results.every(r => r.valid);
  
  if (allValid) {
    console.log(chalk.green('\n🎉 ¡Todos los archivos son válidos!'));
  } else {
    console.log(chalk.red('\n❌ Algunos archivos tienen errores. Revisa los detalles arriba.'));
  }
  
  return allValid;
}

/**
 * Función principal
 */
async function main() {
  const dataDir = process.argv[2] || './data';
  const success = await validateAllFiles(dataDir);
  process.exit(success ? 0 : 1);
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { validateMeetingData, validateFile, validateAllFiles };