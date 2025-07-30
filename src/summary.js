#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Generar resumen de la última ejecución
 */
async function generateSummary() {
  try {
    const dataDir = './data';
    const apiDir = './api';
    
    // Verificar directorios
    if (!await fs.pathExists(dataDir)) {
      return 'No data directory found';
    }
    
    // Encontrar la semana más reciente
    const latestData = await findLatestWeek(dataDir);
    
    if (!latestData) {
      return 'No week data found';
    }
    
    // Generar resumen
    const summary = {
      week: latestData.weekOf,
      meetings: latestData.meetings?.length || 0,
      materials: latestData.stats?.totalMaterials || 0,
      duration: latestData.stats?.totalDuration || 0,
      sections: latestData.stats?.totalSections || 0,
      generatedAt: latestData.metadata?.generatedAt,
      hasErrors: latestData.meetings?.some(m => m.error) || false
    };
    
    // Formatear para GitHub Actions
    const output = [
      `## 📅 ${summary.week}`,
      ``,
      `### 📊 Estadísticas`,
      `- **Reuniones:** ${summary.meetings}`,
      `- **Secciones:** ${summary.sections}`,
      `- **Materiales:** ${summary.materials}`,
      `- **Duración total:** ${summary.duration} minutos`,
      ``,
      `### 🕐 Información`,
      `- **Generado:** ${summary.generatedAt ? format(parseISO(summary.generatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'Desconocido'}`,
      `- **Estado:** ${summary.hasErrors ? '⚠️ Con errores' : '✅ Exitoso'}`,
      ``,
      summary.hasErrors ? `### ⚠️ Advertencias\nAlgunas reuniones tuvieron errores durante el scraping.` : '',
      ``,
      `### 🔗 Enlaces`,
      `- [Ver datos completos](./data/${latestData.year}/week-${latestData.weekNumber.toString().padStart(2, '0')}.json)`,
      `- [API Latest](./api/latest.json)`,
      `- [API Index](./api/index.json)`
    ].filter(line => line !== '').join('\n');
    
    return output;
    
  } catch (error) {
    return `Error generating summary: ${error.message}`;
  }
}

/**
 * Encontrar la semana más reciente
 */
async function findLatestWeek(dataDir) {
  const years = await fs.readdir(dataDir);
  let latestWeek = null;
  let latestDate = null;
  
  for (const year of years) {
    const yearPath = path.join(dataDir, year);
    const stat = await fs.stat(yearPath);
    
    if (stat.isDirectory()) {
      const files = await fs.readdir(yearPath);
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('week-')) {
          const filePath = path.join(yearPath, file);
          
          try {
            const data = await fs.readJson(filePath);
            const weekDate = new Date(data.weekStartDate);
            
            if (!latestDate || weekDate > latestDate) {
              latestDate = weekDate;
              latestWeek = data;
            }
          } catch (error) {
            // Ignorar archivos con errores
          }
        }
      }
    }
  }
  
  return latestWeek;
}

/**
 * Función principal
 */
async function main() {
  const summary = await generateSummary();
  console.log(summary);
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default generateSummary;