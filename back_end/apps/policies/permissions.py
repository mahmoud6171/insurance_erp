from rest_framework.permissions import BasePermission
from apps.users.models import User


class IsManagerOrUnderwriter(BasePermission):
    """
    Allows access only to users with Underwriter, Ops Manager, or Admin roles.
    Zero-Trust enforcement for approval / review workflows.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_underwriter or
            request.user.is_ops_manager or
            request.user.is_admin_user or
            getattr(request.user, 'role', None) in [User.Role.UNDERWRITER, User.Role.OPS_MANAGER, User.Role.ADMIN]
        )


class IsPolicyOwnerOrUnderwriter(BasePermission):
    """
    Allows policy creator/owner or underwriter/manager/admin.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin_user or request.user.is_underwriter or request.user.is_ops_manager:
            return True
        return getattr(obj, 'requested_by', None) == request.user
