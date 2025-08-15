import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserApps } from "@/actions/user-apps";
import { AppCard } from "./app-card";

export function UserApps() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["userApps"],
    queryFn: getUserApps,
    initialData: [],
  });

  const onAppDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["userApps"] });
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8">
        <p className="text-center text-gray-500">Loading your apps...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-8">
        <p className="text-center text-gray-500">Please sign in to view your apps.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-4 sm:px-8">
        <p className="text-center text-gray-500">No apps yet. Create your first app above!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 sm:px-8">
      {data.map((app) => (
        <AppCard 
          key={app.id}
          id={app.id}
          name={app.name}
          createdAt={app.createdAt}
          onDelete={onAppDeleted}
        />
      ))}
    </div>
  );
}
