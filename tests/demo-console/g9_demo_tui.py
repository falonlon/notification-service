from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import Footer, Header, Label, ListItem, ListView, Static, TextArea

from request_templates import DEMO_USER_ID, MENU_OPTIONS, RequestTemplate, template_for


DEMO_DIR = Path(__file__).resolve().parent
EVIDENCE_DIR = DEMO_DIR / "evidence"


@dataclass
class DemoResult:
    case: str
    method: str
    endpoint: str
    status: int | str
    result: str
    event_id: str
    notification_id: str
    request_body: Any
    response_body: Any
    timestamp: str


class G9DemoApp(App):
    CSS = """
    Screen {
        layout: vertical;
    }

    #main {
        height: 1fr;
    }

    #menu-panel {
        width: 34;
        border: solid $accent;
        padding: 1;
    }

    #request-panel {
        width: 1fr;
        border: solid $primary;
        padding: 1;
    }

    #response-panel {
        height: 15;
        border: solid $success;
        padding: 1;
    }

    #request-editor {
        height: 1fr;
    }

    #shortcuts {
        height: 1;
        background: $panel;
        color: $text;
    }
    """

    BINDINGS = [
        Binding("f1", "help", "Ayuda"),
        Binding("f5", "reset_request", "Reset request"),
        Binding("f8", "run_full_demo", "Demo completa"),
        Binding("f9", "edit_request", "Editar request"),
        Binding("f10", "export_evidence", "Exportar evidencia"),
        Binding("enter", "send_request", "Enviar"),
        Binding("ctrl+enter", "send_request", "Enviar"),
        Binding("escape", "cancel_or_exit", "Cancelar/Salir"),
    ]

    def __init__(self, base_url: str, environment: str, title: str) -> None:
        super().__init__()
        self.base_url = base_url.rstrip("/")
        self.environment = environment
        self.title = title
        self.selected_option = 1
        self.current_request = template_for(1)
        self.saved_editor_text = ""
        self.editing = False
        self.last_event_id = ""
        self.last_notification_id = ""
        self.last_user_id = DEMO_USER_ID
        self.last_sent_body: dict[str, Any] | None = None
        self.history: list[DemoResult] = []

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main"):
            with Vertical(id="menu-panel"):
                yield Label("MENU")
                yield ListView(
                    *[ListItem(Label(option)) for option in MENU_OPTIONS],
                    id="menu",
                )
            with Vertical(id="request-panel"):
                yield Label("REQUEST / COMANDO A ENVIAR")
                yield Static("", id="request-meta")
                yield TextArea("", language="json", id="request-editor")
        with Vertical(id="response-panel"):
            yield Label("RESPUESTA DEL BACKEND")
            yield Static("Selecciona una accion y presiona Enter para enviar.", id="response")
        yield Static(
            "F1 Ayuda | F5 Reset request | F8 Demo completa | F9 Editar request | "
            "F10 Exportar evidencia | Enter Enviar | Esc Cancelar/Salir",
            id="shortcuts",
        )
        yield Footer()

    def on_mount(self) -> None:
        editor = self.query_one("#request-editor", TextArea)
        editor.read_only = True
        self.query_one("#menu", ListView).index = 0
        self.refresh_request_panel()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        index = event.list_view.index or 0
        self.selected_option = 0 if index == 12 else index + 1
        self.handle_selected_option(send=True)

    def on_list_view_highlighted(self, event: ListView.Highlighted) -> None:
        index = event.list_view.index or 0
        self.selected_option = 0 if index == 12 else index + 1
        if self.selected_option not in {0, 11, 12}:
            self.handle_selected_option()

    def on_key(self, event) -> None:
        if event.key in {"enter", "ctrl+enter"} and self.editing:
            event.prevent_default()
            event.stop()
            self.action_send_request()

    def handle_selected_option(self, send: bool = False) -> None:
        if self.selected_option == 0:
            self.exit()
            return
        if self.selected_option == 7:
            self.prepare_idempotency_request()
            if send:
                self.action_send_request()
            return
        if self.selected_option == 8:
            self.prepare_mark_read_request()
            if send:
                self.action_send_request()
            return
        if self.selected_option == 11:
            if send:
                self.action_run_full_demo()
            return
        if self.selected_option == 12:
            if send:
                self.action_export_evidence()
            return
        self.current_request = template_for(self.selected_option, self.last_user_id)
        self.refresh_request_panel()
        if send:
            self.action_send_request()

    def refresh_request_panel(self) -> None:
        meta = self.query_one("#request-meta", Static)
        editor = self.query_one("#request-editor", TextArea)
        meta.update(
            f"Method: {self.current_request.method}\n"
            f"Endpoint: {self.current_request.endpoint}\n"
            f"Base URL: {self.base_url}"
        )
        editor.text = self.body_as_text(self.current_request.body)
        editor.read_only = not self.editing

    def body_as_text(self, body: Any) -> str:
        if body is None:
            return "(sin body)"
        return json.dumps(body, indent=2, ensure_ascii=False)

    def action_help(self) -> None:
        self.show_response(
            "Ayuda breve\n\n"
            "- Selecciona una opcion del menu.\n"
            "- Revisa metodo, endpoint y body en el panel derecho.\n"
            "- F9 habilita edicion del JSON antes de enviarlo.\n"
            "- Enter valida y envia el request actual.\n"
            "- F10 exporta evidencia Markdown en tests/demo-console/evidence."
        )

    def action_reset_request(self) -> None:
        self.editing = False
        if self.selected_option in {1, 2, 3, 4, 5, 6, 9, 10}:
            self.current_request = template_for(self.selected_option, self.last_user_id)
        elif self.selected_option == 7:
            self.prepare_idempotency_request()
            return
        elif self.selected_option == 8:
            self.prepare_mark_read_request()
            return
        self.refresh_request_panel()
        self.show_response("Request restaurado a la plantilla original.")

    def action_edit_request(self) -> None:
        if self.current_request.body is None:
            self.show_response("Esta accion no tiene body editable.")
            return
        editor = self.query_one("#request-editor", TextArea)
        self.saved_editor_text = editor.text
        self.editing = True
        editor.read_only = False
        editor.focus()
        self.show_response("Modo edicion activo. Presiona Enter o Ctrl+Enter para validar y enviar. Esc cancela.")

    def action_cancel_or_exit(self) -> None:
        if self.editing:
            editor = self.query_one("#request-editor", TextArea)
            editor.text = self.saved_editor_text
            editor.read_only = True
            self.editing = False
            self.show_response("Edicion cancelada. Se restauro el request anterior.")
            return
        self.exit()

    def action_send_request(self) -> None:
        if self.selected_option == 0:
            self.exit()
            return
        if self.selected_option == 11:
            self.run_full_demo()
            return
        if self.selected_option == 12:
            self.action_export_evidence()
            return
        if self.selected_option == 7 and self.current_request.key != "duplicate":
            self.prepare_idempotency_request()
            return
        if self.selected_option == 8 and self.current_request.key != "mark_read":
            self.prepare_mark_read_request()
            return
        if self.editing:
            parsed_body = self.parse_editor_body()
            if parsed_body is None:
                return
            self.current_request = RequestTemplate(
                self.current_request.key,
                self.current_request.title,
                self.current_request.method,
                self.current_request.endpoint,
                parsed_body,
            )
            self.editing = False
            self.refresh_request_panel()
        self.send_current_request(self.current_request.title, self.current_request)

    def parse_editor_body(self) -> dict[str, Any] | None:
        editor = self.query_one("#request-editor", TextArea)
        try:
            value = json.loads(editor.text)
        except json.JSONDecodeError as exc:
            self.show_response(f"ERROR: JSON invalido.\n{exc}")
            return None
        if not isinstance(value, dict):
            self.show_response("ERROR: El body JSON debe ser un objeto.")
            return None
        return value

    def validate_before_send(self, request: RequestTemplate) -> bool:
        if request.method == "POST" and request.endpoint == "/notifications/test":
            body = request.body or {}
            missing = [
                field
                for field, ok in [
                    ("eventId", bool(body.get("eventId"))),
                    ("eventType", bool(body.get("eventType"))),
                    ("payload.userId", bool((body.get("payload") or {}).get("userId"))),
                ]
                if not ok
            ]
            if missing:
                self.show_response(
                    "ERROR: El request no cumple los campos minimos.\n"
                    "Campos requeridos:\n- eventId\n- eventType\n- payload.userId"
                )
                return False
        return True

    def send_current_request(self, case: str, request: RequestTemplate) -> DemoResult | None:
        if not self.validate_before_send(request):
            return None

        url = f"{self.base_url}{request.endpoint}"
        request_body = request.body
        try:
            response = requests.request(
                request.method,
                url,
                json=request_body if request_body is not None else None,
                timeout=15,
            )
            try:
                response_body: Any = response.json()
            except ValueError:
                response_body = response.text
            result = self.evaluate_result(request, response.status_code, response_body)
            self.capture_state(request, response_body)
            demo_result = DemoResult(
                case=case,
                method=request.method,
                endpoint=request.endpoint,
                status=response.status_code,
                result=result,
                event_id=self.extract_event_id(request_body),
                notification_id=self.extract_notification_id(response_body),
                request_body=request_body,
                response_body=response_body,
                timestamp=self.now_text(),
            )
        except requests.RequestException as exc:
            response_body = {
                "error": "No fue posible conectar con el backend.",
                "detail": str(exc),
            }
            demo_result = DemoResult(
                case=case,
                method=request.method,
                endpoint=request.endpoint,
                status="SIN_RESPUESTA",
                result="ERROR",
                event_id=self.extract_event_id(request_body),
                notification_id="",
                request_body=request_body,
                response_body=response_body,
                timestamp=self.now_text(),
            )

        self.history.append(demo_result)
        self.show_result(demo_result)
        return demo_result

    def evaluate_result(self, request: RequestTemplate, status: int, response_body: Any) -> str:
        if request.key == "duplicate":
            return "OK" if status == 409 else "ADVERTENCIA"
        if 200 <= status < 300:
            return "OK"
        return "ERROR"

    def capture_state(self, request: RequestTemplate, response_body: Any) -> None:
        if request.body:
            event_id = request.body.get("eventId")
            user_id = (request.body.get("payload") or {}).get("userId") or request.body.get("userId")
            if event_id:
                self.last_event_id = event_id
            if user_id:
                self.last_user_id = user_id
            if request.endpoint == "/notifications/test":
                self.last_sent_body = request.body

        notification_id = self.extract_notification_id(response_body)
        if notification_id:
            self.last_notification_id = notification_id

    def extract_event_id(self, body: Any) -> str:
        return body.get("eventId", "") if isinstance(body, dict) else ""

    def extract_notification_id(self, body: Any) -> str:
        if isinstance(body, dict):
            for key in ("notificationId", "id"):
                value = body.get(key)
                if isinstance(value, str):
                    return value
            data = body.get("data")
            if isinstance(data, dict):
                return self.extract_notification_id(data)
            if isinstance(data, list) and data:
                return self.extract_notification_id(data[0])
            notifications = body.get("notifications")
            if isinstance(notifications, list) and notifications:
                return self.extract_notification_id(notifications[0])
        return ""

    def prepare_idempotency_request(self) -> None:
        if not self.last_sent_body:
            self.show_response("Primero debes enviar una notificacion para repetir el mismo eventId.")
            return
        self.current_request = RequestTemplate(
            "duplicate",
            "Probar idempotencia con mismo eventId",
            "POST",
            "/notifications/test",
            self.last_sent_body,
        )
        self.refresh_request_panel()

    def prepare_mark_read_request(self) -> None:
        if not self.last_notification_id:
            self.show_response("Primero debes crear una notificacion.")
            return
        self.current_request = RequestTemplate(
            "mark_read",
            "Marcar ultima notificacion como leida",
            "PATCH",
            f"/notifications/{self.last_notification_id}/read",
        )
        self.refresh_request_panel()

    def action_run_full_demo(self) -> None:
        self.run_full_demo()

    def run_full_demo(self) -> None:
        self.show_response("Ejecutando demo completa...")
        health = template_for(1, self.last_user_id)
        order = template_for(2, self.last_user_id)
        self.send_current_request("Demo completa - conexion", health)
        self.send_current_request("Demo completa - compra", order)
        self.current_request = template_for(6, self.last_user_id)
        self.send_current_request("Demo completa - listar", self.current_request)
        self.prepare_idempotency_request()
        self.send_current_request("Demo completa - duplicado 409", self.current_request)
        if self.last_notification_id:
            self.prepare_mark_read_request()
            self.send_current_request("Demo completa - marcar leida", self.current_request)
        else:
            self.show_response("Demo completa: no hay notificationId para marcar como leida.")
        self.current_request = template_for(9, self.last_user_id)
        self.send_current_request("Demo completa - estadisticas", self.current_request)
        self.current_request = template_for(10, self.last_user_id)
        self.send_current_request("Demo completa - subscription", self.current_request)
        self.refresh_request_panel()

    def action_export_evidence(self) -> None:
        path = self.export_evidence()
        self.show_response(f"Evidencia exportada:\n{path}")

    def export_evidence(self) -> Path:
        EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = EVIDENCE_DIR / f"evidence-{self.environment}-{stamp}.md"
        rows = [
            "| Caso | Metodo | Endpoint | Status HTTP | Resultado | eventId | notificationId |",
            "|---|---|---|---|---|---|---|",
        ]
        for item in self.history:
            rows.append(
                f"| {self.clean_cell(item.case)} | {item.method} | {item.endpoint} | "
                f"{item.status} | {item.result} | {item.event_id} | {item.notification_id} |"
            )

        details: list[str] = []
        for index, item in enumerate(self.history, start=1):
            details.append(
                f"### Prueba {index}: {item.case}\n"
                f"- Fecha: {item.timestamp}\n"
                f"- Request:\n\n```json\n{self.json_block(item.request_body)}\n```\n\n"
                f"- Response:\n\n```json\n{self.json_block(item.response_body)}\n```\n"
            )

        content = (
            "# Evidencia Demo G9 Notificaciones\n\n"
            f"Ambiente: {self.environment}  \n"
            f"Base URL: {self.base_url}  \n"
            f"Fecha: {self.now_text()}  \n\n"
            "## Resumen de pruebas\n\n"
            + "\n".join(rows)
            + "\n\n## Detalle de ejecucion\n\n"
            + "\n".join(details)
        )
        path.write_text(content, encoding="utf-8")
        return path

    def clean_cell(self, value: str) -> str:
        return value.replace("|", "/").replace("\n", " ")

    def json_block(self, value: Any) -> str:
        if value is None:
            return "null"
        if isinstance(value, str):
            return value
        return json.dumps(value, indent=2, ensure_ascii=False)

    def show_result(self, result: DemoResult) -> None:
        messages = [
            f"Caso: {result.case}",
            f"HTTP {result.status} - {result.result}",
            "",
            "Response:",
            self.json_block(result.response_body),
        ]
        warning = self.detect_warnings(result.response_body)
        if warning:
            messages.extend(["", warning])
        if result.case.lower().find("duplicado") >= 0:
            if result.status == 409:
                messages.extend(
                    [
                        "",
                        "OK: idempotencia validada correctamente. "
                        "El mismo eventId no genero otra notificacion.",
                    ]
                )
            else:
                messages.extend(["", "ADVERTENCIA: se esperaba HTTP 409 para el eventId repetido."])
        self.show_response("\n".join(messages))

    def show_response(self, text: str) -> None:
        response = self.query_one("#response", Static)
        response.update(text)

    def detect_warnings(self, value: Any) -> str:
        serialized = self.json_block(value)
        if "DATABASE_ERROR" in serialized:
            return (
                "ERROR DATABASE_ERROR:\n"
                "Posibles causas:\n"
                "- Variables Supabase mal configuradas en Render.\n"
                "- SUPABASE_URL incluye /rest/v1/.\n"
                "- Falta SUPABASE_SERVICE_KEY.\n"
                "- Permisos insuficientes en las tablas.\n"
                "- Render no fue redeployado despues de configurar variables."
            )
        notification_id = self.extract_notification_id(value)
        if notification_id.startswith("NOTIF-000"):
            return (
                "ADVERTENCIA: El notificationId parece secuencial tipo NOTIF-000x.\n"
                "Esto puede indicar que Render sigue ejecutando la version antigua en memoria.\n"
                "Verifica que Render apunte al monorepo bntkpp/fishmarket y al root directory correcto."
            )
        return ""

    def now_text(self) -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run_demo(base_url: str, environment: str, title: str) -> None:
    app = G9DemoApp(base_url=base_url, environment=environment, title=title)
    app.run()
