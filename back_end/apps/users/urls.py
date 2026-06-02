from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, RegisterView, MeView,
    ChangePasswordView, LogoutView, UserViewSet,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('login/',           CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/',   TokenRefreshView.as_view(),          name='token_refresh'),
    path('register/',        RegisterView.as_view(),               name='register'),
    path('me/',              MeView.as_view(),                     name='me'),
    path('change-password/', ChangePasswordView.as_view(),         name='change_password'),
    path('logout/',          LogoutView.as_view(),                 name='logout'),
    path('',                 include(router.urls)),
]
