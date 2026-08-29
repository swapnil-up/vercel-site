// Force matrix presets for Particle Life simulator
// Each preset defines: types, forces (NxN matrix), friction, radius, and description
// forces[i][j] = { strength, collisionStrength, radius, collisionRadius }
// Positive strength = attraction, negative = repulsion

export const PRESETS = {
  cells: {
    name: 'Cells',
    description: 'Particles form tight organic clusters',
    types: 4,
    friction: 0.02,
    interactionRadius: 80,
    forceStrength: 6,
    forces: [
      [ 4, -2,  3, -1],
      [-2,  4, -1,  3],
      [ 3, -1,  4, -2],
      [-1,  3, -2,  4],
    ],
  },
  snakes: {
    name: 'Snakes & Chasers',
    description: 'Predator-prey dynamics — chasers pursue, prey flees',
    types: 4,
    friction: 0.015,
    interactionRadius: 90,
    forceStrength: 8,
    forces: [
      [ 2,  5, -3, -1],
      [-5,  2,  5, -3],
      [-3, -5,  2,  5],
      [ 1, -3, -5,  2],
    ],
  },
  orbiting: {
    name: 'Orbiting Clusters',
    description: 'Types orbit each other in circular patterns',
    types: 3,
    friction: 0.01,
    interactionRadius: 100,
    forceStrength: 5,
    forces: [
      [ 1,  4, -2],
      [-4,  1,  4],
      [ 2, -4,  1],
    ],
  },
  webs: {
    name: 'Webs',
    description: 'Interconnected filaments stretch across space',
    types: 3,
    friction: 0.025,
    interactionRadius: 70,
    forceStrength: 5,
    forces: [
      [ 3,  2,  2],
      [ 2,  3, -1],
      [ 2, -1,  3],
    ],
  },
  territorial: {
    name: 'Territorial',
    description: 'Each type claims and defends its own zone',
    types: 5,
    friction: 0.02,
    interactionRadius: 85,
    forceStrength: 7,
    forces: [
      [ 3, -4, -4, -4, -4],
      [-4,  3, -4, -4, -4],
      [-4, -4,  3, -4, -4],
      [-4, -4, -4,  3, -4],
      [-4, -4, -4, -4,  3],
    ],
  },
  random: {
    name: 'Random Lifeform',
    description: 'Randomly generated rules — every refresh is unique',
    types: 6,
    friction: 0.02,
    interactionRadius: 80,
    forceStrength: 6,
    forces: null, // generated at runtime
  },
}

export function generateRandomForces(types, strength = 6) {
  const forces = []
  for (let i = 0; i < types; i++) {
    forces[i] = []
    for (let j = 0; j < types; j++) {
      if (i === j) {
        forces[i][j] = 2 // self-repulsion (mild)
      } else {
        forces[i][j] = Math.round((Math.random() * 2 - 1) * strength)
      }
    }
  }
  return forces
}

export const COLOR_PALETTES = {
  spectrum: [
    [0.0, 0.7, 1.0],
    [1.0, 0.3, 0.5],
    [0.2, 1.0, 0.5],
    [1.0, 0.8, 0.2],
    [0.6, 0.3, 1.0],
    [1.0, 0.5, 0.0],
    [0.0, 1.0, 0.8],
    [0.9, 0.2, 0.7],
  ],
  neon: [
    [0.0, 1.0, 0.5],
    [1.0, 0.0, 0.5],
    [0.0, 0.5, 1.0],
    [1.0, 1.0, 0.0],
    [0.5, 0.0, 1.0],
    [0.0, 1.0, 1.0],
    [1.0, 0.3, 0.0],
    [0.3, 1.0, 0.0],
  ],
  sunset: [
    [1.0, 0.2, 0.0],
    [1.0, 0.5, 0.0],
    [1.0, 0.8, 0.2],
    [0.8, 0.2, 0.4],
    [0.6, 0.0, 0.6],
    [0.3, 0.0, 0.8],
    [0.0, 0.3, 0.8],
    [0.0, 0.6, 0.6],
  ],
  ice: [
    [0.6, 0.9, 1.0],
    [0.3, 0.7, 1.0],
    [0.0, 0.5, 0.9],
    [0.8, 1.0, 1.0],
    [0.2, 0.4, 0.8],
    [0.9, 0.95, 1.0],
    [0.0, 0.3, 0.7],
    [0.5, 0.8, 0.9],
  ],
}
