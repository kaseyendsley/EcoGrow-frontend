"use client";

import { useQuery } from "@tanstack/react-query";

function fetchHealth() {
  return fetch("http://127.0.0.1:8000/health/").then((res) => res.json());
}

export default function HealthPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (isError) return <p className="p-6">Error fetching health status</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Backend Health</h1>
      <pre className="mt-4 bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
