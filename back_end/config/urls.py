from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection


def health_live(request):
    return JsonResponse({'status': 'live', 'service': 'insurance-erp-backend'}, status=200)


def health_ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return JsonResponse({'status': 'ready', 'database': 'connected'}, status=200)
    except Exception as e:
        return JsonResponse({'status': 'unhealthy', 'database': str(e)}, status=503)


urlpatterns = [
    path('health/live', health_live, name='health-live'),
    path('health/ready', health_ready, name='health-ready'),
    path('admin/', admin.site.urls),
    path('api/auth/',          include('apps.users.urls')),
    path('api/policies/',      include('apps.policies.urls')),
    path('api/operations/',    include('apps.operations.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

# Serve uploaded files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

