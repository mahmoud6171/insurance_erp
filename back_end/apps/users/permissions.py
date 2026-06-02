from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_user


class IsUnderwriter(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_underwriter or request.user.is_admin_user
        )


class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_employee or request.user.is_admin_user
        )


class IsOpsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_ops_manager or request.user.is_admin_user
        )


class IsUnderwriterOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_underwriter or request.user.is_admin_user
        )


class IsOwnerOrAdmin(BasePermission):
    """Object-level: only the owner or admin may act on it."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin_user:
            return True
        owner = getattr(obj, 'requested_by', getattr(obj, 'assigned_to', None))
        return owner == request.user
