import React, { useEffect, useState } from 'react';
import useProfileStore from '../stores/useProfileStore';
import { Loader, AlertCircle, FileText } from 'lucide-react';

export default function AccessLogsPanel() {
  const getUserAccessLogs = useProfileStore((s) => s.getUserAccessLogs);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getUserAccessLogs()
      .then((data) => {
        setLogs(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load access logs');
      })
      .finally(() => setLoading(false));
  }, [getUserAccessLogs]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-6">
      <div className="flex items-center mb-4">
        <FileText className="h-5 w-5 text-blue-600 mr-2" />
        <h2 className="font-semibold text-lg">Access Logs</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin h-6 w-6 text-blue-600" />
          <span className="ml-2 text-gray-600">Loading logs...</span>
        </div>
      ) : error ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-gray-500 text-center py-6">No access logs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Record ID</th>
                <th className="px-3 py-2 text-left">Success</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2">{new Date(Number(log.timestamp) / 1_000_000).toLocaleString()}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.record_id}</td>
                  <td className="px-3 py-2">
                    {log.success ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-red-600">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
