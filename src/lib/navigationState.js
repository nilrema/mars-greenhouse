import { APP_VIEWS } from './appViews.js';
import { greenhouseModules } from './greenhouseModules.js';

export function createInitialNavigationState(initialView = APP_VIEWS.MARS_OVERVIEW) {
  return {
    currentView: initialView,
    selectedModuleId: greenhouseModules[0]?.id ?? null,
    detailContext: {
      crops: [],
      agentEventCount: 0,
    },
  };
}

export function openGreenhouseDetail(state, moduleId, context = {}) {
  return {
    ...state,
    currentView: APP_VIEWS.GREENHOUSE_DETAIL,
    selectedModuleId: moduleId,
    detailContext: {
      ...state.detailContext,
      ...context,
    },
  };
}

export function returnToMarsOverview(state) {
  return {
    ...state,
    currentView: APP_VIEWS.MARS_OVERVIEW,
  };
}
