from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PolicyRequestViewSet, PolicyDocumentViewSet

router = DefaultRouter()
router.register('', PolicyRequestViewSet, basename='policy')

# Documents nested under a policy: /api/policies/<policy_pk>/documents/
doc_router = DefaultRouter()
doc_router.register('documents', PolicyDocumentViewSet, basename='policy-document')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:policy_pk>/', include(doc_router.urls)),
]
