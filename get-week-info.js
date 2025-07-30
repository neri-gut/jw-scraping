#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Obtener información básica de la semana para el commit
 */
async function getWeekInfo() {
  try {
    const apiPath = './api/latest.json';
    
    if (await fs.pathExists(apiPath)) {
      const data = await fs.readJson(apiPath);
      return `${data.weekOf} (${data.meetings?.length || 0} reuniones)`;
    }
    
    // Fallback a buscar en data
    const dataDir = './data';
    if (await fs.pathExists(dataDir)) {
      const currentYear = new Date().getFullYear().toString();
      const yearPath = path.join(dataDir, currentYear);
      
      if (await fs.pathExists(yearPath)) {
        const files = await fs.readdir(yearPath);
        const weekFiles = files.filter(f => f.startsWith('week-') && f.endsWith('.json'));
        
        if (weekFiles.length > 0) {
          // Tomar el último archivo
          const latestFile = weekFiles.sort().pop();
          const filePath = path.join(yearPath, latestFile);
          const data = await fs.readJson(filePath);
          
          return `${data.weekOf} (${data.meetings?.length || 0} reuniones)`;
        }
      }
    }
    
    return format(new Date(), "'Semana del' dd 'de' MMMM", { locale: es });
    
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Ejecutar y mostrar resultado
getWeekInfo().then(console.log).catch(console.error);