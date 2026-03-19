import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_VIEWS } from './appViews.js';
import { greenhouseModules } from './greenhouseModules.js';
import {
  createInitialNavigationState,
  openGreenhouseDetail,
  returnToMarsOverview,
} from './navigationState.js';

test('initial navigation state defaults to Mars Overview and first greenhouse', () => {
  const state = createInitialNavigationState();

  assert.equal(state.currentView, APP_VIEWS.MARS_OVERVIEW);
  assert.equal(state.selectedModuleId, greenhouseModules[0].id);
  assert.deepEqual(state.detailContext, { crops: [], agentEventCount: 0 });
});

test('opening greenhouse detail preserves selected module and supplied context', () => {
  const initialState = createInitialNavigationState();
  const nextState = openGreenhouseDetail(initialState, greenhouseModules[2].id, {
    agentEventCount: 4,
  });

  assert.equal(nextState.currentView, APP_VIEWS.GREENHOUSE_DETAIL);
  assert.equal(nextState.selectedModuleId, greenhouseModules[2].id);
  assert.equal(nextState.detailContext.agentEventCount, 4);
  assert.deepEqual(nextState.detailContext.crops, []);
});

test('returning to Mars Overview keeps the active module selection', () => {
  const detailState = openGreenhouseDetail(
    createInitialNavigationState(),
    greenhouseModules[1].id
  );
  const overviewState = returnToMarsOverview(detailState);

  assert.equal(overviewState.currentView, APP_VIEWS.MARS_OVERVIEW);
  assert.equal(overviewState.selectedModuleId, greenhouseModules[1].id);
});
