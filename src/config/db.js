import dotenv from 'dotenv';
import postgres from 'postgres';

// 1. Cargar variables de entorno:
// Esto debe ejecutarse primero para que process.env.DATABASE_URL esté disponible.
dotenv.config();

// 2. Obtener la cadena de conexión (que ahora está correctamente cargada)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR CRÍTICO: La variable DATABASE_URL no está definida en el .env.");
    process.exit(1);
}

// 3. Inicializar el pool de la librería 'postgres' (con límites para Supabase)
const pool = postgres(connectionString, {
    max: 5, // Límite de conexiones
    idle_timeout: 30,
    connect_timeout: 5 
});

export default pool;
