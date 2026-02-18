'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: { name: string };
}

export default function TasksWidget() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    // Fetch user's assigned tasks from all projects
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/projects?limit=5');
        if (res.ok) {
          const projects = await res.json();
          // Flatten tasks from projects
          const allTasks: TaskItem[] = [];
          for (const project of (projects.data || projects).slice(0, 3)) {
            try {
              const taskRes = await fetch(`/api/projects/${project.id}/tasks?limit=5`);
              if (taskRes.ok) {
                const taskData = await taskRes.json();
                (taskData.data || taskData).slice(0, 3).forEach((t: TaskItem & { project?: { name: string } }) => {
                  allTasks.push({ ...t, project: { name: project.name } });
                });
              }
            } catch {}
          }
          setTasks(allTasks.slice(0, 5));
        }
      } catch {}
    };
    fetchTasks();
  }, []);

  const priorityColors: Record<string, string> = {
    urgent: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">내 태스크</h3>
        <Link href="/projects" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          전체 보기 <ArrowRight size={12} />
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">할당된 태스크가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              {task.status === 'done' ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={16} className={`${priorityColors[task.priority] || 'text-gray-300'} shrink-0`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {task.title}
                </p>
                <p className="text-xs text-gray-400">{task.project.name}</p>
              </div>
              {task.dueDate && (
                <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <Clock size={12} />
                  {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
