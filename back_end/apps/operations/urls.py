from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OperationTaskViewSet

router = DefaultRouter()
router.register('tasks', OperationTaskViewSet, basename='task')

urlpatterns = [path('', include(router.urls))]
