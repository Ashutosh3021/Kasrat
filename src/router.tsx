import { createHashRouter } from 'react-router-dom'
import App from './App'
import HomePage from './pages/HomePage'
import GraphsPage from './pages/GraphsPage'
import PlansPage from './pages/PlansPage'
import HistoryPage from './pages/HistoryPage'
import TimerPage from './pages/TimerPage'
import SettingsPage from './pages/SettingsPage'
import EditPlanPage from './pages/EditPlanPage'
import StartPlanPage from './pages/StartPlanPage'
import AddExercisePage from './pages/AddExercisePage'
import EditSetPage from './pages/EditSetPage'
import StrengthGraphPage from './pages/StrengthGraphPage'
import CardioGraphPage from './pages/CardioGraphPage'
import GlobalProgressPage from './pages/GlobalProgressPage'
import EditGraphPage from './pages/EditGraphPage'
import AboutPage from './pages/AboutPage'
import AppearanceSettingsPage from './pages/settings/AppearanceSettingsPage'
import TimerSettingsPage from './pages/settings/TimerSettingsPage'
import TabSettingsPage from './pages/settings/TabSettingsPage'
import DataSettingsPage from './pages/settings/DataSettingsPage'
import FormatSettingsPage from './pages/settings/FormatSettingsPage'
import BodyMeasurementsPage from './pages/BodyMeasurementsPage'
import StatsPage from './pages/StatsPage'
import CalendarPage from './pages/CalendarPage'
import NutritionPage from './pages/NutritionPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'graphs', element: <GraphsPage /> },
      { path: 'graphs/:name', element: <StrengthGraphPage /> },
      { path: 'cardio-graph/:name', element: <CardioGraphPage /> },
      { path: 'global-progress', element: <GlobalProgressPage /> },
      { path: 'edit-graph/:name', element: <EditGraphPage /> },
      { path: 'plans', element: <PlansPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'timer', element: <TimerPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/appearance', element: <AppearanceSettingsPage /> },
      { path: 'settings/timer', element: <TimerSettingsPage /> },
      { path: 'settings/tabs', element: <TabSettingsPage /> },
      { path: 'settings/data', element: <DataSettingsPage /> },
      { path: 'settings/format', element: <FormatSettingsPage /> },
      { path: 'edit-plan/:id', element: <EditPlanPage /> },
      { path: 'start-plan/:id', element: <StartPlanPage /> },
      { path: 'add-exercise', element: <AddExercisePage /> },
      { path: 'edit-set/:id', element: <EditSetPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'body-measurements', element: <BodyMeasurementsPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'nutrition', element: <NutritionPage /> },
    ]
  }
])
