import React, {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import {
  Home,
  LayoutGrid,
  Users,
  Folder,
  ListTodo,
  ShieldCheck,
  Activity,
  Server as ServerIcon,
  ChartColumn,
  BookOpen,
  Settings as SettingsIcon,
  Plus,
  Menu,
  Search,
  Bell,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { request, sessionSchema, ApiError } from "./api";
import {
  agentSchema,
  projectSchema,
  serverSchema,
  taskSchema,
  approvalSchema,
  eventSchema,
  documentSchema,
  settingsSchema,
  pairTokenSchema,
  messageSchema,
  type Agent,
  type Project,
  type Server,
  type Task,
  type Approval,
  type Event,
  type Document,
  type Settings,
  type ServerConfig,
  type Message,
} from "./models";
import "./style.css";
interface WorkspaceData {
  agents: Agent[];
  projects: Project[];
  servers: Server[];
  tasks: Task[];
  approvals: Approval[];
  events: Event[];
  documents: Document[];
  settings: Settings;
}
interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
}
const navigation: NavigationItem[] = [
  { id: "dashboard", label: "Overview", icon: LayoutGrid },
  { id: "agents", label: "AI Team", icon: Users },
  { id: "projects", label: "Projects", icon: Folder },
  { id: "tasks", label: "Task Board", icon: ListTodo },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "infrastructure", label: "Infrastructure", icon: ServerIcon },
  { id: "costs", label: "Usage & Costs", icon: ChartColumn },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];
const initialSettings: Settings = {
  workspaceName: "Griyo",
  timezone: "Asia/Jakarta",
  dailyBudget: 10,
  monthlyBudget: 100,
};
const initialData: WorkspaceData = {
  agents: [],
  projects: [],
  servers: [],
  tasks: [],
  approvals: [],
  events: [],
  documents: [],
  settings: initialSettings,
};
const defaultConfig: ServerConfig = {
  provider: "OpenAI-compatible",
  endpoint: "https://api.openai.com/v1",
  model: "",
  fallbackModel: "",
  credentialRef: "AI_API_KEY",
  modelOverrides: {},
  dailyBudget: 10,
  maxConcurrency: 2,
  timeoutMinutes: 10,
  maxRetries: 0,
  requireApproval: true,
  isolatedWorkspace: true,
  stopOnBudget: true,
};
function go(route: string) {
  location.hash = route;
}
function Badge({ children }: { children: ReactNode }) {
  const color =
    children === "Working"
      ? "blue"
      : children === "Review" || children === "Pending"
        ? "amber"
        : children === "Online" ||
            children === "Done" ||
            children === "Approved"
          ? "green"
          : children === "Failed" || children === "Rejected"
            ? "red"
            : "gray";
  return <span className={"badge " + color}>{children}</span>;
}
function Head({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card empty">
      <Folder size={30} />
      <h3>Belum ada data</h3>
      <p className="muted">{children}</p>
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="card stat">
      <div className="label">
        {label}
        <Icon size={19} />
      </div>
      <div className="value">{value}</div>
      <small>{note}</small>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState(initialData);
  const [route, setRoute] = useState(location.hash.slice(1) || "dashboard");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ReactNode>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [mobile, setMobile] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [
        agents,
        projects,
        servers,
        tasks,
        approvals,
        events,
        documents,
        settings,
      ] = await Promise.all([
        request("agents", z.array(agentSchema)),
        request("projects", z.array(projectSchema)),
        request("servers", z.array(serverSchema)),
        request("tasks", z.array(taskSchema)),
        request("approvals", z.array(approvalSchema)),
        request("events", z.array(eventSchema)),
        request("documents", z.array(documentSchema)),
        request("settings", settingsSchema),
      ]);
      setData({
        agents,
        projects,
        servers,
        tasks,
        approvals,
        events,
        documents,
        settings,
      });
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.status === 401)
        setAuthenticated(false);
      else
        setError(
          cause instanceof Error ? cause.message : "Gagal mengambil data",
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void request("auth/session", sessionSchema)
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
    const change = () => {
      setRoute(location.hash.slice(1) || "dashboard");
      setFilter("Semua");
      setMobile(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, [authenticated, refresh]);
  async function mutate<T>(
    path: string,
    schema: z.ZodType<T>,
    method: string,
    body: unknown,
  ): Promise<T> {
    const result = await request(path, schema, method, body);
    await refresh();
    return result;
  }
  function run(action: () => Promise<unknown>) {
    void action().catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "Aksi gagal"),
    );
  }
  const projectName = (id: string | null) =>
    data.projects.find((project) => project.id === id)?.name ||
    "Belum di project";
  const serverName = (id: string) =>
    data.servers.find((server) => server.id === id)?.name || "—";
  const agentName = (id: string) =>
    data.agents.find((agent) => agent.id === id)?.name || "—";
  function editAgent(agent?: Agent) {
    const draft: Agent = agent || {
      id: "",
      name: "",
      role: "Backend Engineer",
      description: "",
      skills: [],
      projectId: null,
      serverId: "",
      status: "Available",
      instructions: "",
    };
    setModal(
      <Editor
        title={agent ? "Edit agent" : "Tambah agent"}
        onClose={() => setModal(null)}
        onSubmit={async (form) => {
          const updated: Agent = {
            ...draft,
            name: formString(form, "name"),
            role: formString(form, "role"),
            description: formString(form, "description"),
            skills: formString(form, "skills")
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
            projectId: formString(form, "projectId") || null,
            serverId: formString(form, "serverId"),
            instructions: formString(form, "instructions"),
            status: formString(form, "status"),
          };
          await mutate(
            "agents" + (agent ? "/" + agent.id : ""),
            agentSchema,
            agent ? "PUT" : "POST",
            updated,
          );
          setModal(null);
        }}
      >
        <Field label="Nama">
          <input name="name" required defaultValue={draft.name} />
        </Field>
        <Field label="Role">
          <select name="role" defaultValue={draft.role}>
            {[
              "Project Manager",
              "Backend Engineer",
              "Frontend Engineer",
              "DevOps Engineer",
              "Security Engineer",
              "QA Engineer",
            ].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </Field>
        <Field label="Deskripsi">
          <textarea name="description" defaultValue={draft.description} />
        </Field>
        <Field label="Project">
          <select name="projectId" defaultValue={draft.projectId || ""}>
            <option value="">Belum di project</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="VPS">
          <select name="serverId" defaultValue={draft.serverId}>
            <option value="">Ikuti project</option>
            {data.servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Skills (pisahkan koma)">
          <input name="skills" defaultValue={draft.skills.join(", ")} />
        </Field>
        <Field label="Instruksi agent">
          <textarea name="instructions" defaultValue={draft.instructions} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={draft.status}>
            <option>Available</option>
            <option>Paused</option>
          </select>
        </Field>
      </Editor>,
    );
  }
  function editProject(project?: Project) {
    const draft: Project = project || {
      id: "",
      name: "",
      description: "",
      repositoryUrl: "",
      stack: "",
      workServerId: "",
      deployServerId: "",
      createdAt: new Date().toISOString(),
    };
    setModal(
      <Editor
        title={project ? "Edit project" : "Project baru"}
        onClose={() => setModal(null)}
        onSubmit={async (form) => {
          const updated: Project = {
            ...draft,
            name: formString(form, "name"),
            description: formString(form, "description"),
            repositoryUrl: formString(form, "repositoryUrl"),
            stack: formString(form, "stack"),
            workServerId: formString(form, "workServerId"),
            deployServerId: formString(form, "deployServerId"),
          };
          await mutate(
            "projects" + (project ? "/" + project.id : ""),
            projectSchema,
            project ? "PUT" : "POST",
            updated,
          );
          setModal(null);
        }}
      >
        <Field label="Nama project">
          <input name="name" required defaultValue={draft.name} />
        </Field>
        <Field label="Deskripsi">
          <textarea name="description" defaultValue={draft.description} />
        </Field>
        <Field label="Repository HTTPS">
          <input
            name="repositoryUrl"
            type="url"
            defaultValue={draft.repositoryUrl}
          />
        </Field>
        <Field label="Tech stack">
          <input name="stack" defaultValue={draft.stack} />
        </Field>
        {(["workServerId", "deployServerId"] as const).map((key) => (
          <Field
            key={key}
            label={key === "workServerId" ? "VPS kerja" : "VPS deployment"}
          >
            <select name={key} required defaultValue={draft[key]}>
              <option value="">Pilih VPS</option>
              {data.servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name} · {server.role}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </Editor>,
    );
  }
  function editServer(server?: Server) {
    const draft: Server = server || {
      id: "",
      name: "",
      host: "",
      role: "Development",
      region: "",
      status: "Offline",
      config: defaultConfig,
      metrics: {
        cpuPercent: 0,
        memoryUsedGb: 0,
        memoryTotalGb: 0,
        diskUsedGb: 0,
        diskTotalGb: 0,
        containers: [],
      },
      lastSeen: null,
    };
    setModal(
      <Editor
        title={server ? "Konfigurasi " + server.name : "Hubungkan VPS"}
        onClose={() => setModal(null)}
        onSubmit={async (form) => {
          const config: ServerConfig = {
            ...draft.config,
            provider: formString(form, "provider"),
            endpoint: formString(form, "endpoint"),
            model: formString(form, "model"),
            fallbackModel: formString(form, "fallbackModel"),
            credentialRef: formString(form, "credentialRef"),
            modelOverrides: z
              .record(z.string())
              .parse(
                JSON.parse(
                  formString(form, "modelOverrides") || "{}",
                ) as unknown,
              ),
            dailyBudget: Number(formString(form, "dailyBudget")),
            maxConcurrency: Number(formString(form, "maxConcurrency")),
            timeoutMinutes: Number(formString(form, "timeoutMinutes")),
            requireApproval: form.has("requireApproval"),
          };
          const updated: Server = {
            ...draft,
            name: formString(form, "name"),
            host: formString(form, "host"),
            region: formString(form, "region"),
            role: formString(form, "role"),
            config,
          };
          await mutate(
            "servers" + (server ? "/" + server.id : ""),
            serverSchema,
            server ? "PUT" : "POST",
            updated,
          );
          setModal(null);
        }}
      >
        {(["name", "host", "region"] as const).map((key) => (
          <Field
            key={key}
            label={
              {
                name: "Nama VPS",
                host: "Host / IP (informasi)",
                region: "Region",
              }[key]
            }
          >
            <input
              name={key}
              required={key !== "region"}
              defaultValue={draft[key]}
            />
          </Field>
        ))}
        <Field label="Role VPS">
          <select name="role" defaultValue={draft.role}>
            {["Office", "Development", "Staging", "Production"].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </Field>
        <Field label="Provider">
          <input
            name="provider"
            defaultValue={draft.config.provider}
            readOnly
          />
        </Field>
        <Field label="Endpoint OpenAI-compatible">
          <input
            name="endpoint"
            type="url"
            required
            defaultValue={draft.config.endpoint}
          />
        </Field>
        <Field label="Model AI">
          <input name="model" required defaultValue={draft.config.model} />
        </Field>
        <Field label="Fallback model (reserved)">
          <input
            name="fallbackModel"
            defaultValue={draft.config.fallbackModel}
          />
        </Field>
        <Field label="Credential reference di runner">
          <input
            name="credentialRef"
            pattern="AI_[A-Z0-9_]+"
            required
            defaultValue={draft.config.credentialRef}
          />
        </Field>
        <Field label="Model per role (JSON)">
          <textarea
            name="modelOverrides"
            defaultValue={JSON.stringify(draft.config.modelOverrides, null, 2)}
          />
        </Field>
        {(["dailyBudget", "maxConcurrency", "timeoutMinutes"] as const).map(
          (key) => (
            <Field
              key={key}
              label={
                {
                  dailyBudget: "Budget harian USD",
                  maxConcurrency: "Max agent bersamaan",
                  timeoutMinutes: "Timeout menit",
                }[key]
              }
            >
              <input
                name={key}
                type="number"
                min="1"
                defaultValue={draft.config[key]}
                required
              />
            </Field>
          ),
        )}
        <label>
          <input
            name="requireApproval"
            type="checkbox"
            defaultChecked={draft.config.requireApproval}
          />{" "}
          Wajib approval deployment
        </label>
      </Editor>,
    );
  }
  function newTask() {
    setModal(
      <Editor
        title="Brief tugas baru"
        onClose={() => setModal(null)}
        onSubmit={async (form) => {
          const projectId = formString(form, "projectId");
          const agentId = formString(form, "agentId");
          const agent = data.agents.find((item) => item.id === agentId);
          if (agent?.projectId !== projectId)
            throw new Error("Agent harus berada di project yang dipilih");
          await mutate("tasks", taskSchema, "POST", {
            title: formString(form, "title"),
            brief: formString(form, "brief"),
            criteria: formString(form, "criteria"),
            projectId,
            agentId,
            priority: formString(form, "priority"),
            budget: Number(formString(form, "budget")),
          });
          setModal(null);
          go("tasks");
        }}
      >
        <Field label="Judul tugas">
          <input name="title" required />
        </Field>
        <Field label="Project">
          <select name="projectId" required>
            <option value="">Pilih project</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Agent">
          <select name="agentId" required>
            <option value="">Pilih agent</option>
            {data.agents
              .filter((agent) => agent.projectId && agent.status !== "Paused")
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {projectName(agent.projectId)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Brief">
          <textarea name="brief" required rows={4} />
        </Field>
        <Field label="Acceptance criteria">
          <textarea name="criteria" required rows={3} />
        </Field>
        <Field label="Prioritas">
          <select name="priority">
            <option>Medium</option>
            <option>High</option>
            <option>Low</option>
          </select>
        </Field>
        <Field label="Budget maksimum USD">
          <input
            name="budget"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue="1"
            required
          />
        </Field>
        <div className="callout">
          Tugas masuk antrean VPS kerja project. Runner mengambilnya setelah
          tersambung.
        </div>
      </Editor>,
    );
  }
  const taskTable = (tasks: Task[]) =>
    tasks.length ? (
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tugas</th>
              <th>Project</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => go("tasks/" + task.id)}
                className="clickable"
              >
                <td>
                  <strong>{task.title}</strong>
                  <div className="muted">
                    {task.priority} · ${task.budget.toFixed(2)} limit
                  </div>
                </td>
                <td>{projectName(task.projectId)}</td>
                <td>{agentName(task.agentId)}</td>
                <td>
                  <Badge>{task.status}</Badge>
                </td>
                <td>
                  <div className="progress">
                    <span style={{ width: task.progress + "%" }} />
                  </div>
                  <small>{task.progress}%</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty>Buat brief untuk memulai pekerjaan tim AI.</Empty>
    );
  const section = route.split("/")[0] || "dashboard";
  const detailId = route.split("/")[1];
  let content: ReactNode;
  if (section === "dashboard")
    content = (
      <>
        <Head
          title="Selamat pagi, Dry"
          description="Tim lo siap bekerja. Ini yang sedang berjalan hari ini."
        >
          <button className="btn primary" onClick={newTask}>
            <Plus size={17} /> Buat tugas
          </button>
        </Head>
        <section className="welcome">
          <div>
            <div className="eyebrow">Your office, in motion</div>
            <h2>Ide lo. Tim AI yang mengerjakan.</h2>
            <p>
              {data.tasks.filter((task) => task.status === "Working").length}{" "}
              tugas sedang dikerjakan.{" "}
              {
                data.approvals.filter(
                  (approval) => approval.status === "Pending",
                ).length
              }{" "}
              approval menunggu keputusan lo.
            </p>
          </div>
          <div className="welcome-aside">
            <div className="mini-team">
              {data.agents.slice(0, 4).map((agent) => (
                <div className="avatar" key={agent.id}>
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
            <button className="btn lime" onClick={newTask}>
              Brief tim sekarang
            </button>
          </div>
        </section>
        <div className="stats">
          <Stat
            label="Agent bekerja"
            value={`${data.tasks.filter((task) => task.status === "Working").length} / ${data.agents.length}`}
            note="Tim di seluruh VPS"
            icon={Users}
          />
          <Stat
            label="Tugas aktif"
            value={
              data.tasks.filter((task) => task.status === "Working").length
            }
            note={`${data.projects.length} project terdaftar`}
            icon={ListTodo}
          />
          <Stat
            label="Butuh keputusan"
            value={
              data.approvals.filter((approval) => approval.status === "Pending")
                .length
            }
            note="Permintaan approval owner"
            icon={ShieldCheck}
          />
          <Stat
            label="Biaya tercatat"
            value={
              "$" +
              data.tasks
                .reduce((total, task) => total + task.spent, 0)
                .toFixed(4)
            }
            note={`Budget harian $${data.settings.dailyBudget}`}
            icon={ChartColumn}
          />
        </div>
        <div className="grid2">
          <div className="stack">
            <section className="card">
              <div className="section-head">
                <h2>Pekerjaan yang sedang berjalan</h2>
                <a className="text-link" href="#tasks">
                  Lihat board
                </a>
              </div>
              {data.tasks
                .filter((task) => task.status === "Working")
                .map((task) => (
                  <a
                    className="task-row"
                    key={task.id}
                    href={"#tasks/" + task.id}
                  >
                    <div className="avatar">
                      {agentName(task.agentId).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="info">
                      <h3>{task.title}</h3>
                      <small className="muted">
                        {projectName(task.projectId)} ·{" "}
                        {agentName(task.agentId)}
                      </small>
                      <div className="progress">
                        <span style={{ width: task.progress + "%" }} />
                      </div>
                    </div>
                    <Badge>{task.status}</Badge>
                  </a>
                ))}
              {!data.tasks.some((task) => task.status === "Working") && (
                <p className="body-copy">
                  Belum ada tugas berjalan. Buat brief setelah runner online.
                </p>
              )}
            </section>
            <section className="card">
              <div className="section-head">
                <h2>Project lo</h2>
                <a className="text-link" href="#projects">
                  Semua project
                </a>
              </div>
              {data.projects.slice(0, 2).map((project) => (
                <a
                  className="task-row"
                  href={"#projects/" + project.id}
                  key={project.id}
                >
                  <div className="avatar">{project.name.slice(0, 1)}</div>
                  <div className="info">
                    <h3>{project.name}</h3>
                    <small className="muted">{project.description}</small>
                  </div>
                  <strong>
                    {
                      data.tasks.filter((task) => task.projectId === project.id)
                        .length
                    }{" "}
                    task
                  </strong>
                </a>
              ))}
              {!data.projects.length && (
                <p className="body-copy">Tambahkan project pertama lo.</p>
              )}
            </section>
          </div>
          <div className="stack">
            <section className="card">
              <div className="section-head">
                <h2>Perlu perhatian</h2>
                <Badge>
                  {data.approvals.some(
                    (approval) => approval.status === "Pending",
                  )
                    ? "Pending"
                    : "Clear"}
                </Badge>
              </div>
              <div className="approval-note">
                <h3>Review hasil tim</h3>
                <p>
                  {data.tasks.filter((task) => task.status === "Review").length}{" "}
                  proposal siap direview sebelum dilanjutkan.
                </p>
                <button className="btn small" onClick={() => go("tasks")}>
                  Review pekerjaan
                </button>
              </div>
              <div className="kv">
                <span>VPS online</span>
                <strong>
                  {
                    data.servers.filter((server) => server.status === "Online")
                      .length
                  }{" "}
                  / {data.servers.length}
                </strong>
              </div>
            </section>
            <section className="card">
              <div className="section-head">
                <h2>Aktivitas terbaru</h2>
                <a className="text-link" href="#activity">
                  Semua
                </a>
              </div>
              {data.events.slice(0, 3).map((event) => (
                <div className="timeline-item" key={event.id}>
                  <div className="avatar">
                    <Activity size={18} />
                  </div>
                  <div>
                    <p>{event.text}</p>
                    <small className="muted">
                      {new Date(event.createdAt).toLocaleString()}
                    </small>
                  </div>
                </div>
              ))}
              {!data.events.length && (
                <p className="body-copy">Aktivitas tim muncul di sini.</p>
              )}
            </section>
          </div>
        </div>
      </>
    );
  else if (section === "agents" && detailId) {
    const agent = data.agents.find((item) => item.id === detailId);
    content = agent ? (
      <>
        <Head title={agent.name} description={agent.role}>
          <button className="btn" onClick={() => editAgent(agent)}>
            Edit agent
          </button>
        </Head>
        <div className="card padded">
          <Badge>{agent.status}</Badge>
          <h2>{agent.description}</h2>
          <p>Project: {projectName(agent.projectId)}</p>
          <div className="tags">
            {agent.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <h3>Instruksi kerja</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {agent.instructions || "Belum ada instruksi tambahan"}
          </p>
        </div>
        <h2>Tugas agent</h2>
        {taskTable(data.tasks.filter((task) => task.agentId === agent.id))}
      </>
    ) : (
      <Empty>Agent tidak ditemukan.</Empty>
    );
  } else if (section === "agents")
    content = (
      <>
        <Head
          title="AI Team"
          description="Karyawan AI dengan skill berbeda. Satu agent, maksimal satu project."
        >
          <button className="btn primary" onClick={() => editAgent()}>
            <Plus size={17} /> Tambah agent
          </button>
        </Head>
        <div className="toolbar">
          <input
            placeholder="Cari nama atau skill agent"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>Semua</option>
            <option>Belum di project</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="team-grid">
          {data.agents
            .filter(
              (agent) =>
                (agent.name + " " + agent.role + " " + agent.skills.join(" "))
                  .toLowerCase()
                  .includes(search.toLowerCase()) &&
                (filter === "Semua" ||
                  (filter === "Belum di project"
                    ? agent.projectId === null
                    : agent.projectId === filter)),
            )
            .map((agent) => agentCard(agent))}
        </div>
        {!data.agents.length && (
          <Empty>
            Tambahkan backend, frontend, DevOps, atau agent lainnya.
          </Empty>
        )}
      </>
    );
  else if (section === "projects" && detailId) {
    const project = data.projects.find((item) => item.id === detailId);
    content = project ? (
      <>
        <Head title={project.name} description={project.description}>
          <button className="btn" onClick={() => editProject(project)}>
            Edit project
          </button>
          <button className="btn primary" onClick={newTask}>
            Buat tugas
          </button>
        </Head>
        <div className="card padded">
          <p>{project.stack}</p>
          <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
            {project.repositoryUrl}
          </a>
          <p>
            VPS kerja: {serverName(project.workServerId)} · Deployment:{" "}
            {serverName(project.deployServerId)}
          </p>
        </div>
        <h2>Tim project</h2>
        <div className="team-grid">
          {data.agents
            .filter((agent) => agent.projectId === project.id)
            .map((agent) => agentCard(agent))}
        </div>
        <h2>Pekerjaan</h2>
        {taskTable(data.tasks.filter((task) => task.projectId === project.id))}
      </>
    ) : (
      <Empty>Project tidak ditemukan.</Empty>
    );
  } else if (section === "projects")
    content = (
      <>
        <Head
          title="Projects"
          description="Project, repository, dan tim yang mengerjakannya."
        >
          <button className="btn primary" onClick={() => editProject()}>
            <Plus size={17} /> Project baru
          </button>
        </Head>
        <div className="project-grid">
          {data.projects.map((project) => {
            const tasks = data.tasks.filter(
              (task) => task.projectId === project.id,
            );
            const progress = tasks.length
              ? Math.round(
                  (tasks.filter((task) => task.status === "Done").length /
                    tasks.length) *
                    100,
                )
              : 0;
            return (
              <button
                className="card project-card"
                key={project.id}
                onClick={() => go("projects/" + project.id)}
              >
                <div className="avatar">{project.name.slice(0, 1)}</div>
                <h2>{project.name}</h2>
                <p className="muted">{project.description}</p>
                <div className="tags">
                  <span>{project.stack}</span>
                </div>
                <p>
                  {tasks.length} tugas ·{" "}
                  {
                    data.agents.filter(
                      (agent) => agent.projectId === project.id,
                    ).length
                  }{" "}
                  agent
                </p>
                <div className="progress">
                  <span style={{ width: progress + "%" }} />
                </div>
                <small>{progress}% selesai</small>
              </button>
            );
          })}
        </div>
        {!data.projects.length && (
          <Empty>Hubungkan VPS lalu tambahkan project pertama.</Empty>
        )}
      </>
    );
  else if (section === "tasks" && detailId) {
    const task = data.tasks.find((item) => item.id === detailId);
    content = task ? (
      <TaskDetail
        task={task}
        agentName={agentName(task.agentId)}
        projectName={projectName(task.projectId)}
        onUpdate={(status) =>
          run(() =>
            mutate("tasks/" + task.id, taskSchema, "PUT", {
              status,
              progress: task.progress,
              result: task.result,
              error: task.error,
              spent: task.spent,
              leaseId: "",
            }),
          )
        }
        onApproval={() =>
          run(() =>
            mutate(
              "tasks/" + task.id + "/approval",
              approvalSchema,
              "POST",
              {},
            ),
          )
        }
      />
    ) : (
      <Empty>Tugas tidak ditemukan.</Empty>
    );
  } else if (section === "tasks")
    content = (
      <>
        <Head
          title="Task Board"
          description="Dari brief hingga hasil yang siap direview."
        >
          <button className="btn primary" onClick={newTask}>
            <Plus size={17} /> Buat tugas
          </button>
        </Head>
        <div className="toolbar">
          <input
            placeholder="Cari tugas"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {[
              "Semua",
              "Queued",
              "Working",
              "Review",
              "Done",
              "Failed",
              "Paused",
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="board">
          {(
            ["Queued", "Working", "Review", "Done", "Paused", "Failed"] as const
          )
            .filter((status) => filter === "Semua" || filter === status)
            .map((status) => (
              <section className="column" key={status}>
                <div className="column-header">
                  <span>
                    {
                      {
                        Queued: "Antrian",
                        Working: "Dikerjakan",
                        Review: "Review",
                        Done: "Selesai",
                        Paused: "Dijeda",
                        Failed: "Gagal",
                      }[status]
                    }{" "}
                    <span className="muted">
                      {
                        data.tasks.filter((task) => task.status === status)
                          .length
                      }
                    </span>
                  </span>
                  <button
                    aria-label={"Tambah tugas " + status}
                    onClick={newTask}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {data.tasks
                  .filter(
                    (task) =>
                      task.status === status &&
                      task.title.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((task) => (
                    <button
                      className="task-card"
                      key={task.id}
                      onClick={() => go("tasks/" + task.id)}
                    >
                      <div className="section-head" style={{ margin: 0 }}>
                        <small className="muted">{task.id.slice(0, 8)}</small>
                        <Badge>{task.priority}</Badge>
                      </div>
                      <h3>{task.title}</h3>
                      <div className="tags">
                        <span className="tag">
                          {projectName(task.projectId)}
                        </span>
                      </div>
                      {status === "Working" && (
                        <div className="progress">
                          <span style={{ width: task.progress + "%" }} />
                        </div>
                      )}
                      <div className="meta">
                        <div className="avatar">
                          {agentName(task.agentId).slice(0, 2).toUpperCase()}
                        </div>
                        <small className="muted">
                          {agentName(task.agentId)}
                        </small>
                      </div>
                    </button>
                  ))}
              </section>
            ))}
        </div>
      </>
    );
  else if (section === "infrastructure" && detailId) {
    const server = data.servers.find((item) => item.id === detailId);
    content = server ? (
      <>
        <Head
          title={server.name}
          description={`${server.host} · ${server.region} · ${server.role}`}
        >
          <button className="btn" onClick={() => editServer(server)}>
            Config VPS
          </button>
          <button className="btn primary" onClick={() => pair(server)}>
            Pair runner
          </button>
        </Head>
        <div className="stats">
          <Stat
            label="Status"
            value={<Badge>{server.status}</Badge>}
            note={
              server.lastSeen
                ? new Date(server.lastSeen).toLocaleString()
                : "Belum ada heartbeat"
            }
            icon={ServerIcon}
          />
          <Stat
            label="Memory"
            value={server.metrics.memoryUsedGb.toFixed(1) + " GB"}
            note={"dari " + server.metrics.memoryTotalGb.toFixed(1) + " GB"}
            icon={Activity}
          />
          <Stat
            label="Concurrency"
            value={server.config.maxConcurrency}
            note="Batas tugas bersamaan"
            icon={Users}
          />
          <Stat
            label="Budget harian"
            value={"$" + server.config.dailyBudget}
            note="Batas reservasi tugas"
            icon={ChartColumn}
          />
        </div>
        <div className="card padded">
          <h2>Model configuration</h2>
          <p>
            {server.config.provider} · {server.config.model}
          </p>
          <p className="muted">Endpoint: {server.config.endpoint}</p>
          <p>Credential: {server.config.credentialRef}</p>
          <p>
            Runner menghasilkan proposal kode untuk direview. Eksekusi container
            belum diaktifkan pada versi ini.
          </p>
        </div>
        <h2>Tugas pada VPS</h2>
        {taskTable(
          data.tasks.filter((task) => task.workServerId === server.id),
        )}
      </>
    ) : (
      <Empty>VPS tidak ditemukan.</Empty>
    );
  } else if (section === "infrastructure")
    content = (
      <>
        <Head
          title="Infrastructure"
          description="Satu kantor, banyak VPS. Kelola koneksi dan model tiap server."
        >
          <button className="btn primary" onClick={() => editServer()}>
            <Plus size={17} /> Hubungkan VPS
          </button>
        </Head>
        <div className="stats">
          <Stat
            label="Total VPS"
            value={data.servers.length}
            note="Fleet terdaftar"
            icon={ServerIcon}
          />
          <Stat
            label="Online"
            value={
              data.servers.filter((server) => server.status === "Online").length
            }
            note="Heartbeat dalam 60 detik"
            icon={Activity}
          />
          <Stat
            label="Agent"
            value={data.agents.length}
            note="Anggota AI team"
            icon={Users}
          />
          <Stat
            label="Working"
            value={
              data.tasks.filter((task) => task.status === "Working").length
            }
            note="Tugas berjalan"
            icon={ListTodo}
          />
        </div>
        <div className="server-grid">
          {data.servers.map((server) => (
            <div className="card server-card" key={server.id}>
              <div className="section-head">
                <div className="avatar">
                  <ServerIcon size={20} />
                </div>
                <Badge>{server.status}</Badge>
              </div>
              <h2>{server.name}</h2>
              <p className="muted">
                {server.host} · {server.region}
              </p>
              <div className="tags">
                <span>{server.role}</span>
                <span>{server.config.model}</span>
              </div>
              <div className="server-assignment">
                <strong>
                  {
                    data.tasks.filter(
                      (task) =>
                        task.workServerId === server.id &&
                        task.status === "Working",
                    ).length
                  }{" "}
                  tugas aktif
                </strong>
                <small>
                  ${server.config.dailyBudget}/hari ·{" "}
                  {server.config.maxConcurrency} concurrency
                </small>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => editServer(server)}>
                  Config VPS
                </button>
                <button
                  className="btn primary"
                  onClick={() => go("infrastructure/" + server.id)}
                >
                  Detail →
                </button>
              </div>
            </div>
          ))}
        </div>
        {!data.servers.length && (
          <Empty>
            Daftarkan VPS lalu jalankan runner dengan pairing token.
          </Empty>
        )}
      </>
    );
  else if (section === "approvals")
    content = (
      <>
        <Head
          title="Approvals"
          description="Review dan putuskan permintaan deployment. Approval tidak menjalankan deploy otomatis."
        />
        {data.approvals.map((approval) => (
          <div className="card padded" key={approval.id}>
            <div className="section-head">
              <h2>
                {data.tasks.find((task) => task.id === approval.taskId)
                  ?.title || approval.taskId}
              </h2>
              <Badge>{approval.status}</Badge>
            </div>
            <p>Target: {serverName(approval.serverId)}</p>
            <p>{approval.reason}</p>
            {approval.status === "Pending" && (
              <div className="actions">
                {(["Approved", "Rejected"] as const).map((status) => (
                  <button
                    key={status}
                    className={
                      "btn " + (status === "Approved" ? "primary" : "")
                    }
                    onClick={() =>
                      run(() =>
                        mutate(
                          "approvals/" + approval.id,
                          approvalSchema,
                          "PUT",
                          {
                            status,
                            reason:
                              status === "Approved"
                                ? "Owner approved"
                                : "Owner rejected",
                          },
                        ),
                      )
                    }
                  >
                    {status === "Approved" ? "Approve" : "Reject"}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {!data.approvals.length && (
          <Empty>
            Permintaan dari tugas yang selesai direview muncul di sini.
          </Empty>
        )}
      </>
    );
  else if (section === "activity")
    content = (
      <>
        <Head
          title="Activity"
          description="Jejak pekerjaan tim dan keputusan owner."
        />
        <div className="card padded">
          {data.events.map((event) => (
            <div className="activity-row" key={event.id}>
              <Activity size={18} />
              <div>
                <p>{event.text}</p>
                <small className="muted">
                  {new Date(event.createdAt).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
          {!data.events.length && <p>Belum ada aktivitas.</p>}
        </div>
      </>
    );
  else if (section === "costs") {
    const spent = data.tasks.reduce((total, task) => total + task.spent, 0);
    content = (
      <>
        <Head
          title="Usage & Costs"
          description="Biaya tercatat dari runner dan budget yang ditetapkan."
        />
        <div className="stats">
          <Stat
            label="Total tercatat"
            value={"$" + spent.toFixed(4)}
            note="Estimasi dari token dan tarif konfigurasi"
            icon={ChartColumn}
          />
          <Stat
            label="Budget harian"
            value={"$" + data.settings.dailyBudget}
            note="Workspace setting"
            icon={SettingsIcon}
          />
          <Stat
            label="Budget bulanan"
            value={"$" + data.settings.monthlyBudget}
            note="Workspace setting"
            icon={ChartColumn}
          />
          <Stat
            label="Task budget"
            value={
              "$" +
              data.tasks
                .reduce((total, task) => total + task.budget, 0)
                .toFixed(2)
            }
            note="Total batas semua tugas"
            icon={ListTodo}
          />
        </div>
        {taskTable(data.tasks)}
      </>
    );
  } else if (section === "knowledge")
    content = (
      <>
        <Head title="Knowledge" description="Catatan project dan panduan tim.">
          <button
            className="btn primary"
            onClick={() =>
              setModal(
                <Editor
                  title="Dokumen baru"
                  onClose={() => setModal(null)}
                  onSubmit={async (form) => {
                    await mutate("documents", documentSchema, "POST", {
                      title: formString(form, "title"),
                      body: formString(form, "body"),
                      projectId: formString(form, "projectId"),
                    });
                    setModal(null);
                  }}
                >
                  <Field label="Project">
                    <select name="projectId" required>
                      {data.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Judul">
                    <input name="title" required />
                  </Field>
                  <Field label="Isi">
                    <textarea name="body" rows={8} required />
                  </Field>
                </Editor>,
              )
            }
          >
            <Plus size={17} /> Tambah dokumen
          </button>
        </Head>
        {data.documents.map((doc) => (
          <div className="card padded" key={doc.id}>
            <Badge>{projectName(doc.projectId)}</Badge>
            <h2>{doc.title}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{doc.body}</p>
          </div>
        ))}
        {!data.documents.length && (
          <Empty>
            Tambahkan spesifikasi dan panduan project. Dokumen tersimpan;
            injeksi ke prompt belum otomatis.
          </Empty>
        )}
      </>
    );
  else
    content = (
      <>
        <Head
          title="Settings"
          description="Atur workspace dan preferensi budget."
        />
        <Editor
          embedded
          title="General"
          onClose={() => undefined}
          onSubmit={async (form) => {
            await mutate("settings", settingsSchema, "PUT", {
              workspaceName: formString(form, "workspaceName"),
              timezone: formString(form, "timezone"),
              dailyBudget: Number(formString(form, "dailyBudget")),
              monthlyBudget: Number(formString(form, "monthlyBudget")),
            });
          }}
        >
          <Field label="Nama workspace">
            <input
              name="workspaceName"
              required
              defaultValue={data.settings.workspaceName}
            />
          </Field>
          <Field label="Timezone">
            <input
              name="timezone"
              required
              defaultValue={data.settings.timezone}
            />
          </Field>
          <Field label="Budget harian USD">
            <input
              name="dailyBudget"
              type="number"
              min="1"
              defaultValue={data.settings.dailyBudget}
            />
          </Field>
          <Field label="Budget bulanan USD">
            <input
              name="monthlyBudget"
              type="number"
              min="1"
              defaultValue={data.settings.monthlyBudget}
            />
          </Field>
          <a className="btn" href="/api/docs" target="_blank">
            Buka Swagger API ↗
          </a>
        </Editor>
      </>
    );
  function agentCard(agent: Agent) {
    const active = data.tasks.find(
      (task) => task.agentId === agent.id && task.status === "Working",
    );
    return (
      <div className="card agent-card" key={agent.id}>
        <div className="agent-top">
          <div className="avatar">{agent.name.slice(0, 2).toUpperCase()}</div>
          <Badge>{active ? "Working" : agent.status}</Badge>
        </div>
        <h2>{agent.name}</h2>
        <div className="role">{agent.role}</div>
        <p className="muted">{agent.description}</p>
        <div className="tags">
          {agent.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <div className="agent-project">
          <Folder size={15} />
          <span>{projectName(agent.projectId)}</span>
        </div>
        <div className="agent-task">
          <small className="muted">Sedang dikerjakan</small>
          <p>{active?.title || "Siap menerima pekerjaan"}</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => editAgent(agent)}>
            Kelola
          </button>
          <button
            className="btn primary"
            onClick={() => go("agents/" + agent.id)}
          >
            Lihat agent →
          </button>
        </div>
      </div>
    );
  }
  function pair(server: Server) {
    run(async () => {
      const result = await request(
        "servers/" + server.id + "/pair",
        pairTokenSchema,
        "POST",
        {},
      );
      setModal(
        <div className="modal">
          <div className="modal-head">
            <h2>Pair runner · {server.name}</h2>
            <button onClick={() => setModal(null)} aria-label="Tutup">
              ×
            </button>
          </div>
          <div className="modal-body">
            <p>
              Token hanya ditampilkan sekali. Simpan sebagai RUNNER_TOKEN di VPS
              ini.
            </p>
            <pre className="code-block">{result.token}</pre>
            <button
              className="btn"
              onClick={() =>
                run(() => navigator.clipboard.writeText(result.token))
              }
            >
              Copy token
            </button>
            <p>
              GRIYO_URL adalah URL HTTPS kantor Griyo. Credential model disimpan
              di environment runner dengan nama {server.config.credentialRef}.
            </p>
          </div>
        </div>,
      );
    });
  }
  if (authenticated === null)
    return (
      <div className="login">
        <p>Memuat Griyo…</p>
      </div>
    );
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;
  return (
    <div className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <button
          className="mobile-close"
          aria-label="Tutup navigasi"
          onClick={() => setMobile(false)}
        >
          ×
        </button>
        <a href="#dashboard" className="brand">
          <span className="mark">
            <Home size={23} />
          </span>
          griyo<small>AI OFFICE</small>
        </a>
        <div className="workspace">
          <div className="avatar">
            {data.settings.workspaceName.slice(0, 1)}
          </div>
          <div>
            <strong>{data.settings.workspaceName}</strong>
            <br />
            <small className="muted">Personal workspace</small>
          </div>
        </div>
        <span className="eyebrow">Workspace</span>
        <nav className="nav">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={"#" + item.id}
              className={section === item.id ? "active" : ""}
            >
              <item.icon size={19} />
              {item.label}
              {item.id === "approvals" &&
                data.approvals.some(
                  (approval) => approval.status === "Pending",
                ) && (
                  <span className="count">
                    {
                      data.approvals.filter(
                        (approval) => approval.status === "Pending",
                      ).length
                    }
                  </span>
                )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="server-mini">
            <strong>
              <span className="dot" />
              VPS fleet
            </strong>
            <p className="muted">
              {
                data.servers.filter((server) => server.status === "Online")
                  .length
              }{" "}
              / {data.servers.length} online
            </p>
          </div>
          <div className="user">
            <div className="avatar">LF</div>
            <div>
              <strong>Owner</strong>
              <br />
              <small className="muted">Workspace admin</small>
            </div>
            <button
              aria-label="Keluar"
              onClick={() =>
                run(async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setAuthenticated(false);
                })
              }
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div>
        <header className="topbar">
          <div className="left">
            <button
              className="mobile-menu"
              aria-label="Buka navigasi"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span className="muted crumb">Workspace /</span>
            <strong>
              {navigation.find((item) => item.id === section)?.label}
            </strong>
          </div>
          <div className="right">
            <button
              className="search-top"
              onClick={() => {
                go("tasks");
                setSearch("");
              }}
            >
              <Search size={16} /> Cari di workspace
            </button>
            <span className="proto">{loading ? "Syncing…" : "AI Office"}</span>
            <button
              className="icon-btn"
              aria-label="Notifikasi approval"
              onClick={() => go("approvals")}
            >
              <Bell size={19} />
            </button>
            <div className="avatar">LF</div>
          </div>
        </header>
        <main className="main">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {content}
        </main>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div onClick={(event) => event.stopPropagation()}>{modal}</div>
        </div>
      )}
    </div>
  );
}
function formString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
interface EditorProps {
  title: string;
  onSubmit: (form: FormData) => Promise<void>;
  onClose: () => void;
  children: ReactNode;
  embedded?: boolean;
}
function Editor({
  title,
  onSubmit,
  onClose,
  children,
  embedded = false,
}: EditorProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSubmit(form);
      setSaved(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className={embedded ? "card padded" : "modal"}
      onSubmit={(event) => void submit(event)}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        {!embedded && (
          <button type="button" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        )}
      </div>
      <div className="modal-body form-grid">
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        {children}
        {saved && <p role="status">Tersimpan.</p>}
      </div>
      <div className="modal-foot">
        {!embedded && (
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
function Login({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="login">
      <div className="login-brand">
        <span className="mark">
          <Home />
        </span>
        <h1>griyo</h1>
      </div>
      <p>Kantor AI, dalam kendalimu.</p>
      <Editor
        embedded
        title="Masuk workspace"
        onClose={() => undefined}
        onSubmit={async (form) => {
          await request("auth/login", sessionSchema, "POST", {
            password: formString(form, "password"),
          });
          onSuccess();
        }}
      >
        <Field label="Owner password">
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
      </Editor>
    </div>
  );
}
function TaskDetail({
  task,
  agentName,
  projectName,
  onUpdate,
  onApproval,
}: {
  task: Task;
  agentName: string;
  projectName: string;
  onUpdate: (status: string) => void;
  onApproval: () => void;
}) {
  const [tab, setTab] = useState("Overview");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void request("tasks/" + task.id + "/messages", z.array(messageSchema))
      .then(setMessages)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Gagal memuat pesan"),
      );
  }, [task.id]);
  return (
    <>
      <Head title={task.title} description={`${projectName} · ${agentName}`}>
        <Badge>{task.status}</Badge>
        {["Queued", "Working"].includes(task.status) && (
          <button className="btn" onClick={() => onUpdate("Paused")}>
            Pause
          </button>
        )}
        {["Paused", "Failed"].includes(task.status) && (
          <button className="btn" onClick={() => onUpdate("Queued")}>
            Ulangi
          </button>
        )}
        {task.status === "Review" && (
          <>
            <button className="btn primary" onClick={() => onUpdate("Done")}>
              Tandai selesai
            </button>
            <button className="btn" onClick={onApproval}>
              Minta approval
            </button>
          </>
        )}
      </Head>
      <div className="tabs">
        {["Overview", "Conversation", "Changes", "Tests", "Logs"].map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <div className="card padded">
        {error && <p role="alert">{error}</p>}
        {tab === "Overview" ? (
          <>
            <h2>Brief</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{task.brief}</p>
            <h3>Acceptance criteria</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{task.criteria}</p>
            <p>
              {task.provider} · {task.model} · budget ${task.budget}
            </p>
            <div className="progress">
              <span style={{ width: task.progress + "%" }} />
            </div>
          </>
        ) : tab === "Conversation" ? (
          <>
            {messages.map((message) => (
              <div className="message" key={message.id}>
                <strong>{message.author}</strong>
                <p>{message.text}</p>
              </div>
            ))}
            <Editor
              embedded
              title="Catatan owner"
              onClose={() => undefined}
              onSubmit={async (form) => {
                const message = await request(
                  "tasks/" + task.id + "/messages",
                  messageSchema,
                  "POST",
                  { text: formString(form, "text") },
                );
                setMessages((current) => [...current, message]);
              }}
            >
              <textarea
                name="text"
                required
                placeholder="Tambahkan catatan review (belum memicu rerun otomatis)"
              />
            </Editor>
          </>
        ) : tab === "Changes" ? (
          <>
            <h2>Proposal kode</h2>
            <pre className="code-block">
              {task.result || "Runner belum mengirim proposal."}
            </pre>
          </>
        ) : tab === "Tests" ? (
          <>
            <h2>Verifikasi</h2>
            <p>
              Test belum dijalankan otomatis. Daftar test dari proposal adalah
              saran, bukan hasil eksekusi.
            </p>
          </>
        ) : (
          <>
            <h2>Execution log</h2>
            <p>
              Status: {task.status} · progress {task.progress}%
            </p>
            <p role="alert">{task.error || "Tidak ada error tercatat."}</p>
            <p>Biaya estimasi: ${task.spent.toFixed(4)}</p>
          </>
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
