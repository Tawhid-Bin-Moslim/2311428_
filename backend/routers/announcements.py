
from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import get_current_user

from schemas.announcements import (
    AnnouncementCreate,
    AnnouncementUpdate,
)

from services.announcements import (
    create_announcement,
    list_announcements,
    get_announcement,
    update_announcement,
    archive_announcement,
)


router = APIRouter(
    prefix="/api/announcements",
    tags=["Announcement Management"],
)


@router.post("", status_code=201)
def create_new_announcement(
    request: AnnouncementCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_announcement(request, current_user)


@router.get("")
def get_announcements(
    current_user: dict = Depends(get_current_user),
):
    return list_announcements(current_user)


@router.get("/{announcement_id}")
def get_announcement_details(
    announcement_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return get_announcement(announcement_id, current_user)


@router.put("/{announcement_id}")
def edit_announcement(
    announcement_id: UUID,
    request: AnnouncementUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_announcement(
        announcement_id,
        request,
        current_user,
    )


@router.patch("/{announcement_id}/archive")
def archive_existing_announcement(
    announcement_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return archive_announcement(
        announcement_id,
        current_user,
    )
