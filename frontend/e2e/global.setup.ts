import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔄 Setting up E2E environment for Herd...');
  console.log('⚠️  Using existing local database. Skipping migrations to protect data.');
  // Aquí podemos añadir llamadas a la API o comandos artisan seguros 
  // para crear un usuario de pruebas si no existe.
}

export default globalSetup;
