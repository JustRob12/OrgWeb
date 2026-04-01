import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      <ul className="list-disc pl-5">
        {todos?.map((todo: any) => (
          <li key={todo.id}>{todo.name || todo.title || JSON.stringify(todo)}</li>
        ))}
        {todos?.length === 0 && <li>No todos found (table might be empty).</li>}
      </ul>
      {!todos && !error && <p>Loading or no data returned...</p>}
    </div>
  );
}
