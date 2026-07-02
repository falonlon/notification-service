from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


DEMO_USER_ID = "USR-DEMO-G9"


@dataclass(frozen=True)
class RequestTemplate:
    key: str
    title: str
    method: str
    endpoint: str
    body: dict[str, Any] | None = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def compact_timestamp() -> str:
    return utc_now().strftime("%Y%m%d%H%M%S")


def iso_timestamp() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def event_id() -> str:
    return f"EVT-DEMO-{compact_timestamp()}"


def order_created_body() -> dict[str, Any]:
    return {
        "eventId": event_id(),
        "eventType": "OrderCreated",
        "version": "1.0",
        "occurredAt": iso_timestamp(),
        "producer": "order-service",
        "correlationId": "corr-demo-order",
        "payload": {
            "userId": DEMO_USER_ID,
            "orderId": "ORD-DEMO-001",
            "totalAmount": 49990,
            "currency": "CLP",
        },
    }


def payment_approved_body() -> dict[str, Any]:
    return {
        "eventId": event_id(),
        "eventType": "PaymentApproved",
        "version": "1.0",
        "occurredAt": iso_timestamp(),
        "producer": "payment-service",
        "correlationId": "corr-demo-payment-approved",
        "payload": {
            "userId": DEMO_USER_ID,
            "orderId": "ORD-DEMO-001",
            "paymentId": "PAY-DEMO-001",
            "amount": 49990,
            "currency": "CLP",
        },
    }


def payment_rejected_body() -> dict[str, Any]:
    return {
        "eventId": event_id(),
        "eventType": "PaymentRejected",
        "version": "1.0",
        "occurredAt": iso_timestamp(),
        "producer": "payment-service",
        "correlationId": "corr-demo-payment-rejected",
        "payload": {
            "userId": DEMO_USER_ID,
            "orderId": "ORD-DEMO-001",
            "paymentId": "PAY-DEMO-002",
            "reason": "Fondos insuficientes",
        },
    }


def shipment_created_body() -> dict[str, Any]:
    return {
        "eventId": event_id(),
        "eventType": "ShipmentCreated",
        "version": "1.0",
        "occurredAt": iso_timestamp(),
        "producer": "shipment-service",
        "correlationId": "corr-demo-shipment",
        "payload": {
            "userId": DEMO_USER_ID,
            "orderId": "ORD-DEMO-001",
            "shipmentId": "SHIP-DEMO-001",
            "carrier": "Demo Carrier",
        },
    }


def subscription_body() -> dict[str, Any]:
    return {
        "userId": DEMO_USER_ID,
        "platform": "web",
        "subscription": {
            "endpoint": "https://example.com/mock-push-endpoint",
            "keys": {
                "p256dh": "mock-p256dh",
                "auth": "mock-auth",
            },
        },
    }


def template_for(option: int, last_user_id: str = DEMO_USER_ID) -> RequestTemplate:
    templates: dict[int, RequestTemplate] = {
        1: RequestTemplate("health", "Verificar conexion", "GET", "/"),
        2: RequestTemplate(
            "order_created",
            "Enviar notificacion de compra",
            "POST",
            "/notifications/test",
            order_created_body(),
        ),
        3: RequestTemplate(
            "payment_approved",
            "Enviar pago aprobado",
            "POST",
            "/notifications/test",
            payment_approved_body(),
        ),
        4: RequestTemplate(
            "payment_rejected",
            "Enviar pago rechazado",
            "POST",
            "/notifications/test",
            payment_rejected_body(),
        ),
        5: RequestTemplate(
            "shipment_created",
            "Enviar despacho creado",
            "POST",
            "/notifications/test",
            shipment_created_body(),
        ),
        6: RequestTemplate(
            "list_notifications",
            "Listar notificaciones del usuario demo",
            "GET",
            f"/notifications?userId={last_user_id or DEMO_USER_ID}&page=1&size=10",
        ),
        9: RequestTemplate("stats", "Ver estadisticas", "GET", "/notifications/stats"),
        10: RequestTemplate(
            "subscription",
            "Registrar subscription mock",
            "POST",
            "/notifications/subscriptions",
            subscription_body(),
        ),
    }
    return deepcopy(templates[option])


MENU_OPTIONS = [
    "1. Verificar conexion",
    "2. Enviar notificacion de compra",
    "3. Enviar pago aprobado",
    "4. Enviar pago rechazado",
    "5. Enviar despacho creado",
    "6. Listar notificaciones del usuario demo",
    "7. Probar idempotencia con mismo eventId",
    "8. Marcar ultima notificacion como leida",
    "9. Ver estadisticas",
    "10. Registrar subscription mock",
    "11. Ejecutar demo completa",
    "12. Exportar evidencia",
    "0. Salir",
]
