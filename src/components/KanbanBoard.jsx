import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCollectionItem, db, FIRESTORE_COLLECTIONS } from '../services/firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import TaskCard from './TaskCard';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const DEPARTMENTS = ['Product', 'Engineering', 'Operations', 'Marketing'];

const createEmptyTask = (profile) => ({
  title: '',
  description: '',
  priority: 'Medium',
  status: 'To Do',
  department: profile?.department || 'Product',
  assignee: profile?.name || 'Unassigned',
  dueDate: '',
  labels: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  comments: [],
  activity: [],
  attachments: [],
  meetingId: '',
});

function KanbanBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: 'All', assignee: 'All', priority: 'All', status: 'All', dueDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [draft, setDraft] = useState(createEmptyTask(profile));
  const [optimistic, setOptimistic] = useState(false);

  useEffect(() => {
    setDraft(createEmptyTask(profile));
  }, [profile]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get('taskId');
    if (!taskId || !tasks.length) return;
    const matchedTask = tasks.find((task) => task.id === taskId);
    if (matchedTask && (!activeTask || activeTask.id !== matchedTask.id)) {
      setActiveTask(matchedTask);
      setDraft(matchedTask);
      setModalOpen(true);
    }
  }, [location.search, tasks, activeTask]);

  useEffect(() => {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.tasks), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setTasks(items);
      setLoading(false);
    }, (err) => {
      setError(err.message || 'Unable to load tasks');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !search || [task.title, task.description, task.assignee, task.department].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = filters.department === 'All' || task.department === filters.department;
      const matchesAssignee = filters.assignee === 'All' || task.assignee === filters.assignee;
      const matchesPriority = filters.priority === 'All' || task.priority === filters.priority;
      const matchesStatus = filters.status === 'All' || task.status === filters.status;
      const matchesDueDate = !filters.dueDate || task.dueDate === filters.dueDate;
      return matchesSearch && matchesDepartment && matchesAssignee && matchesPriority && matchesStatus && matchesDueDate;
    });
  }, [tasks, search, filters]);

  const groupedTasks = useMemo(() => {
    return STATUSES.reduce((acc, status) => {
      acc[status] = visibleTasks.filter((task) => task.status === status);
      return acc;
    }, {});
  }, [visibleTasks]);

  const handleCreateOrUpdateTask = async () => {
    try {
      setOptimistic(true);
      const taskPayload = {
        ...draft,
        labels: draft.labels,
        updatedAt: new Date().toISOString(),
        createdAt: draft.createdAt || new Date().toISOString(),
      };

      if (activeTask?.id) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.tasks, activeTask.id), taskPayload);
      } else {
        await createCollectionItem(FIRESTORE_COLLECTIONS.tasks, taskPayload);
      }

      setModalOpen(false);
      setActiveTask(null);
      setDraft(createEmptyTask(profile));
    } catch (err) {
      setError(err.message || 'Task save failed');
    } finally {
      setOptimistic(false);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      setOptimistic(true);
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.tasks, id));
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setOptimistic(false);
    }
  };

  const handleDuplicateTask = async (task) => {
    try {
      setOptimistic(true);
      const duplicated = {
        ...task,
        id: undefined,
        title: `${task.title} Copy`,
        status: 'To Do',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createCollectionItem(FIRESTORE_COLLECTIONS.tasks, duplicated);
    } catch (err) {
      setError(err.message || 'Duplicate failed');
    } finally {
      setOptimistic(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(tasks, oldIndex, newIndex);
    setTasks(reordered);

    const movedTask = reordered[newIndex];
    if (movedTask) {
      try {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.tasks, movedTask.id), { status: movedTask.status, updatedAt: new Date().toISOString() });
      } catch (err) {
        setError(err.message || 'Update failed');
      }
    }
  };

  const openTaskModal = (task) => {
    setActiveTask(task || null);
    setDraft(task || createEmptyTask(profile));
    setModalOpen(true);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">PR</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Professional Kanban</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <button className="ghost-btn" onClick={() => navigate('/dashboard')} type="button">Dashboard</button>
          <button className="ghost-btn" onClick={logout} type="button">Logout</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Operations Center</p>
            <h2>Turn AI action items into a living delivery board.</h2>
            <p>Manage work across teams, track ownership, and keep delivery moving with a premium, responsive board.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">Realtime board</div>
            <div className="summary-value">{tasks.length} tasks</div>
            <p>Changes sync instantly to Firebase and are ready for collaboration.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Board Controls</h3>
            <button className="primary-btn" type="button" onClick={() => openTaskModal(null)}>Create Task</button>
          </div>
          <div className="filter-grid">
            <input className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" />
            <select className="input-field" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <select className="input-field" value={filters.assignee} onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}>
              <option value="All">All Assignees</option>
              {Array.from(new Set(tasks.map((task) => task.assignee))).filter(Boolean).map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
            </select>
            <select className="input-field" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="All">All Priorities</option>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
            <select className="input-field" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="All">All Statuses</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input className="input-field" type="date" value={filters.dueDate} onChange={(e) => setFilters({ ...filters, dueDate: e.target.value })} />
          </div>
          {error ? <p className="auth-message">{error}</p> : null}
        </section>

        {loading ? <div className="loading-screen">Loading your board…</div> : (
          <DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {STATUSES.map((status) => (
                <section key={status} className="kanban-column">
                  <div className="kanban-column-header">
                    <h3>{status}</h3>
                    <span>{groupedTasks[status].length}</span>
                  </div>
                  <SortableContext items={groupedTasks[status].map((task) => task.id)} strategy={verticalListSortingStrategy}>
                    <div className="kanban-column-body">
                      {groupedTasks[status].map((task) => (
                        <TaskCard key={task.id} task={task} onOpenTask={openTaskModal} onDeleteTask={handleDeleteTask} onDuplicateTask={handleDuplicateTask} />
                      ))}
                    </div>
                  </SortableContext>
                </section>
              ))}
            </div>
          </DndContext>
        )}

        {modalOpen ? (
          <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <h3>{activeTask ? 'Edit Task' : 'Create Task'}</h3>
                <button className="ghost-btn" type="button" onClick={() => setModalOpen(false)}>Close</button>
              </div>
              <div className="modal-grid">
                <input className="input-field" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <textarea className="input-field" placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                <select className="input-field" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                  {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
                <select className="input-field" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className="input-field" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })}>
                  {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <input className="input-field" placeholder="Assignee" value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} />
                <input className="input-field" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
                <input className="input-field" placeholder="Labels" value={draft.labels} onChange={(e) => setDraft({ ...draft, labels: e.target.value })} />
                <input className="input-field" placeholder="Meeting ID" value={draft.meetingId} onChange={(e) => setDraft({ ...draft, meetingId: e.target.value })} />
              </div>
              <div className="hero-actions">
                <button className="primary-btn" type="button" onClick={handleCreateOrUpdateTask} disabled={optimistic}>{optimistic ? 'Saving...' : 'Save Task'}</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default KanbanBoard;
