import { Order, Requester } from '@/shared/types';
import { gameState, addOrder } from '@/game/state';
import { getUnlockedRecipes } from '@/game/recipes';

let nextOrderId = 1;
let orderTimer = 0;
const ORDER_INTERVAL_MIN = 60 * 30; // ~30 seconds
const ORDER_INTERVAL_MAX = 60 * 60; // ~60 seconds
let nextSpawnAt = ORDER_INTERVAL_MIN;

const REQUESTERS: Requester[] = ['cat', 'monster'];

export function updateOrders(): void {
  if (gameState.phase !== 'exploring') return;
  if (gameState.activeOrders.length >= 3) return;

  orderTimer++;
  if (orderTimer < nextSpawnAt) return;

  orderTimer = 0;
  nextSpawnAt = ORDER_INTERVAL_MIN + Math.random() * (ORDER_INTERVAL_MAX - ORDER_INTERVAL_MIN);

  spawnRandomOrder();
}

function spawnRandomOrder(): void {
  const recipes = getUnlockedRecipes();
  if (recipes.length === 0) return;

  // Pick a requester that doesn't already have an order
  const busy = new Set(gameState.activeOrders.map(o => o.requester));
  const available = REQUESTERS.filter(r => !busy.has(r));
  if (available.length === 0) return;

  const requester = available[Math.floor(Math.random() * available.length)];
  const recipe = recipes[Math.floor(Math.random() * recipes.length)];

  const order: Order = {
    id: nextOrderId++,
    requester,
    recipe,
    spawnedAt: Date.now(),
  };

  addOrder(order);
}

export function getOrderForRequester(requester: Requester): Order | undefined {
  return gameState.activeOrders.find(o => o.requester === requester);
}

export function hasMatchingPotion(requester: Requester): boolean {
  const order = getOrderForRequester(requester);
  if (!order || !gameState.brewedPotion) return false;
  return gameState.brewedPotion.id === order.recipe.id;
}
