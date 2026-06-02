from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',          include('apps.users.urls')),
    path('api/policies/',      include('apps.policies.urls')),
    path('api/operations/',    include('apps.operations.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

# Serve uploaded files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
