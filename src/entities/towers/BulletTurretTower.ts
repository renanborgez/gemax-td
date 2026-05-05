import { Tower } from '@/entities/Tower';

/**
 * Bullet Turret — the campaign's base tower. Fires single kinetic
 * projectiles at a steady rate. Cheap, reliable, and the implicit "first
 * placement" that anchors every fresh map.
 */
export class BulletTurretTower extends Tower {}
