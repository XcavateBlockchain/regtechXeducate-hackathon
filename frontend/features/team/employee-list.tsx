"use client";

type EmployeeRow = {
  id: string;
  permission: string;
  department: string | null;
  jobTitle: string | null;
  joinedAt: string;
  user: {
    id: string;
    userId: string;
    name: string;
    email: string;
    walletAddress: string;
  };
};

export function EmployeeList({ employees }: { employees: EmployeeRow[] }) {
  if (!employees.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No employees yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Employees</h2>
      </div>
      <ul className="divide-y divide-border">
        {employees.map((e) => (
          <li key={e.id} className="px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {e.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.user.email}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {e.permission}
                {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                {e.department ? ` · ${e.department}` : ""}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
