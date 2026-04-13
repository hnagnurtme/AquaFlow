/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useGardenWebSocket } from './hooks/useGardenWebSocket';

import { Header } from './components/dashboard/Header';
import { StatusCards } from './components/dashboard/StatusCards';
import { ChartSection } from './components/dashboard/ChartSection';
import { ControlPanel } from './components/dashboard/ControlPanel';
import { LogsTerminal } from './components/dashboard/LogsTerminal';

export default function App() {
  const { state, actions } = useGardenWebSocket();

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-8 md:pb-10">
      {/* Decorative Background Elements */}
      <div className="fixed top-20 right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] -z-10 rounded-full" />
      <div className="fixed bottom-0 left-[-5%] w-[30%] h-[30%] bg-secondary/10 blur-[120px] -z-10 rounded-full" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Header 
          ipAddress={state.ipAddress}
          setIpAddress={actions.setIpAddress}
          wsStatus={state.wsStatus}
          connectWS={actions.connectWS}
          uptime={state.uptime}
        />

        {/* 3-column layout: trạng thái | điều khiển | biểu đồ (ưu tiên chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-3">
            <ControlPanel 
              mode={state.mode}
              handleModeChange={actions.handleModeChange}
              handleTurnAllOff={actions.handleTurnAllOff}
              handleSaveConfig={actions.handleSaveConfig}
              maxVolume={state.maxVolume}
              autoInThreshold={state.autoInThreshold}
              autoOutThreshold={state.autoOutThreshold}
            />
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <StatusCards 
              wsStatus={state.wsStatus}
              volume={state.volume}
              maxVolume={state.maxVolume}
              autoInThreshold={state.autoInThreshold}
              autoOutThreshold={state.autoOutThreshold}
              pumpIn={state.pumpIn}
              pumpOut={state.pumpOut}
              handleTogglePump={actions.handleTogglePump}
            />
          </div>

          <div className="lg:col-span-6">
            <ChartSection 
              wsStatus={state.wsStatus}
              chartData={state.chartData}
              maxVolume={state.maxVolume}
              autoInThreshold={state.autoInThreshold}
              autoOutThreshold={state.autoOutThreshold}
              mode={state.mode}
            />
          </div>
        </div>

        <div className="mt-6 glass-card p-5 rounded-[24px] border border-white/50">
          <details>
            <summary className="cursor-pointer font-bold text-sm uppercase tracking-wider text-on-surface-variant">
              Nhật ký hệ thống (mở khi cần)
            </summary>
            <div className="mt-4">
              <LogsTerminal logs={state.logs} />
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
