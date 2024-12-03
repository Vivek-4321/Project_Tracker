import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Layout,
  Plus,
  User,
  X,
  GripHorizontal,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Clock,
  GitBranch,
  MessageSquare,
  Tag,
  Clock8,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react";
import "./ProjectBoard.css";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ContextMenu = ({ x, y, onClose, onUpdate, onDelete }) => {
  return (
    <div
      className="context-menu"
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 1000,
        backgroundColor: "white",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        borderRadius: "4px",
        padding: "4px 0",
      }}
    >
      <button className="context-menu-item" onClick={onUpdate}>
        <Edit size={14} />
        <span>Edit</span>
      </button>
      <button className="context-menu-item" onClick={onDelete}>
        <Trash2 size={14} />
        <span>Delete</span>
      </button>
    </div>
  );
};

const PRIORITY_COLORS = {
  low: "#2563eb",
  medium: "#d97706",
  high: "#dc2626",
  critical: "#7f1d1d",
};

const TICKET_TYPES = {
  feature: "Feature",
  bug: "Bug",
  task: "Task",
  improvement: "Improvement",
};

const getDeadlineStatus = (deadline) => {
  if (!deadline) return null;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "urgent";
  if (diffDays <= 7) return "upcoming";
  return "normal";
};

const formatDeadline = (deadline) => {
  if (!deadline) return null;
  const date = new Date(deadline);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMediaType = (url) => {
  if (!url) return null;
  const fileNameMatch = url.match(/tickets%2F(.+?)\?/);
  if (!fileNameMatch) return null;
  const fileName = decodeURIComponent(fileNameMatch[1]);
  const extension = fileName.split(".").pop().toLowerCase();
  if (["jpeg", "jpg", "gif", "png"].includes(extension)) return "image";
  if (["mp4", "webm", "ogg", "mov"].includes(extension)) return "video";
  return null;
};

const Ticket = ({ ticket, teamMembers, onDragStart, onDragEnd, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEditTicket = () => {
    onEdit(ticket);
    handleCloseContextMenu();
  };

  const handleDeleteTicket = () => {
    onDelete(ticket.id);
    handleCloseContextMenu();
  };

  const hasExpandableContent =
    (ticket.description && ticket.description.length > 100) ||
    ticket.media_url ||
    ticket.labels?.length > 0;

  const copyTicketId = () => {
    navigator.clipboard.writeText(ticket.uuid);
    // You could add a toast notification here
  };

  const generateGitBranch = () => {
    const sanitizedTitle = ticket.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    return `feature/${ticket.uuid.slice(0, 8)}/${sanitizedTitle}`;
  };

  const fetchComments = async () => {
    if (!showComments) return;

    const { data, error } = await supabase
      .from("ticket_comments")
      .select(
        `
        id,
        comment,
        created_at,
        user_id,
        users:user_id (name)
      `
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setComments(data);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [showComments]);

  const addComment = async () => {
    if (!newComment.trim()) return;

    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticket.id,
      user_id: 1, // Replace with actual user ID
      comment: newComment,
    });

    if (!error) {
      setNewComment("");
      fetchComments();
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div
    className="ticket"
    draggable
    onDragStart={(e) => onDragStart(e, ticket)}
    onDragEnd={onDragEnd}
    onContextMenu={handleContextMenu}
  >
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onUpdate={handleEditTicket}
          onDelete={handleDeleteTicket}
        />
      )}
      <div className="ticket-header">
        <div className="ticket-drag-handle">
          <GripHorizontal size={16} />
        </div>
        <div className="ticket-meta">
          <span className={`ticket-type ${ticket.ticket_type}`}>
            {TICKET_TYPES[ticket.ticket_type]}
          </span>
          <span className={`ticket-priority ${ticket.priority}`}>
            {ticket.priority}
          </span>
        </div>
      </div>

      <h3 className="ticket-title">{ticket.title}</h3>

      <div className="ticket-id-section">
        <span className="ticket-id">{ticket.uuid.slice(0, 8)}</span>
        <button className="icon-button" onClick={copyTicketId}>
          <Copy size={14} />
        </button>
        <button
          className="icon-button"
          onClick={() => {
            navigator.clipboard.writeText(generateGitBranch());
          }}
        >
          <GitBranch size={14} />
        </button>
      </div>

      <div className={`ticket-collapsible ${isExpanded ? "expanded" : ""}`}>
        {ticket.description && (
          <p className="ticket-description">
            {isExpanded ? ticket.description : ticket.description.slice(0, 100)}
            {!isExpanded && ticket.description.length > 100 && "..."}
          </p>
        )}

        {ticket.labels?.length > 0 && (
          <div className="ticket-labels">
            {ticket.labels.map((label, index) => (
              <span key={index} className="label">
                <Tag size={12} />
                {label}
              </span>
            ))}
          </div>
        )}

        {ticket.media_url && isExpanded && (
          <div className="ticket-media">
            {getMediaType(ticket.media_url) === "image" ? (
              <img
                src={ticket.media_url}
                alt={ticket.title}
                loading="lazy"
                className="media-content"
              />
            ) : getMediaType(ticket.media_url) === "video" ? (
              <video
                controls
                width="100%"
                height="auto"
                preload="metadata"
                className="media-content"
              >
                <source src={ticket.media_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : null}
          </div>
        )}

        {isExpanded && (
          <div className="ticket-timestamps">
            <div className="timestamp">
              <Clock size={14} />
              <span>Created: {formatDate(ticket.created_at)}</span>
            </div>
            {ticket.in_progress_at && (
              <div className="timestamp">
                <Clock8 size={14} />
                <span>Started: {formatDate(ticket.in_progress_at)}</span>
              </div>
            )}
            {ticket.done_at && (
              <div className="timestamp">
                <Clock8 size={14} />
                <span>Completed: {formatDate(ticket.done_at)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {hasExpandableContent && (
        <button
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {ticket.deadline && (
        <div
          className={`ticket-deadline ${getDeadlineStatus(ticket.deadline)}`}
        >
          <Calendar size={14} />
          <span>{formatDeadline(ticket.deadline)}</span>
        </div>
      )}

      <div className="ticket-footer">
        <div className="assignee">
          <User size={16} />
          <span>
            {teamMembers.find((m) => m.id === parseInt(ticket.assignee))
              ?.name || "Unassigned"}
          </span>
        </div>
        <div className="ticket-metrics">
          {ticket.estimated_hours && (
            <span className="hours-estimate">
              {ticket.estimated_hours}h est.
            </span>
          )}
          <span className="story-points">{ticket.story_points || 0} pts</span>
        </div>
      </div>

      <div className="ticket-comments-section">
        <button
          className="comments-toggle"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare size={16} />
          <span>{comments.length} comments</span>
        </button>

        {showComments && (
          <div className="comments-container">
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <span className="comment-author">{comment.users.name}</span>
                    <span className="comment-date">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="comment-text">{comment.comment}</p>
                </div>
              ))}
            </div>
            <div className="comment-input">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="comment-textarea"
              />
              <button
                className="button button-primary"
                onClick={addComment}
                disabled={!newComment.trim()}
              >
                Comment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectBoard = ({ isAdmin }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingTicket, setEditingTicket] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    story_points: 0,
    assignee: "",
    status: "todo",
    deadline: "",
    media_url: "",
    priority: "medium",
    ticket_type: "feature",
    labels: [],
    estimated_hours: null,
    actual_hours: null,
    created_by: 1, // Add default created_by value (replace with actual user ID)
  });

  const teamMembers = [
    { id: 1, name: "Ameen" },
    { id: 2, name: "Hilesh" },
    { id: 3, name: "Sanal" },
    { id: 4, name: "Vivek" },
  ];

  const columns = {
    todo: { title: "To Do", items: [] },
    inProgress: { title: "In Progress", items: [] },
    review: { title: "Review", items: [] },
    done: { title: "Done", items: [] },
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleEditTicket = (ticket) => {
    setEditingTicket(ticket);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTicket = async () => {
    try {
      if (!editingTicket.title) {
        alert("Title is required");
        return;
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          title: editingTicket.title,
          description: editingTicket.description,
          story_points: editingTicket.story_points,
          assignee: editingTicket.assignee,
          deadline: editingTicket.deadline,
          priority: editingTicket.priority,
          ticket_type: editingTicket.ticket_type,
          labels: editingTicket.labels,
          estimated_hours: editingTicket.estimated_hours
        })
        .eq("id", editingTicket.id);

      if (updateError) throw updateError;

      setIsEditDialogOpen(false);
      setEditingTicket(null);
      fetchTickets();
    } catch (err) {
      console.error("Error updating ticket:", err);
      alert(`Failed to update ticket: ${err.message}`);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this ticket?");
    
    if (confirmDelete) {
      try {
        const { error: deleteError } = await supabase
          .from("tickets")
          .delete()
          .eq("id", ticketId);

        if (deleteError) throw deleteError;

        fetchTickets();
      } catch (err) {
        console.error("Error deleting ticket:", err);
        alert(`Failed to delete ticket: ${err.message}`);
      }
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTickets(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadProgress(0);

      // Validate file size (5MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size should not exceed 5MB");
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "video/mp4",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("File type not supported");
      }

      // Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;

      // Create storage reference
      const storageRef = ref(storage, `tickets/${fileName}`);

      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Monitor upload progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          throw error;
        },
        async () => {
          // Get download URL after successful upload
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setNewTicket({ ...newTicket, media_url: downloadURL });
          setUploadProgress(100);

          // Reset progress after a delay
          setTimeout(() => setUploadProgress(0), 1000);
        }
      );
    } catch (err) {
      console.error("Error uploading file:", err);
      alert(err.message || "Failed to upload file");
      setUploadProgress(0);
    }
  };

  const handleCreateTicket = async () => {
    try {
      if (!newTicket.title) {
        alert("Title is required");
        return;
      }

      const ticket = {
        title: newTicket.title,
        description: newTicket.description,
        story_points: newTicket.story_points,
        assignee: newTicket.assignee || null,
        status: newTicket.status,
        deadline: newTicket.deadline || null,
        media_url: newTicket.media_url || null,
        priority: newTicket.priority,
        ticket_type: newTicket.ticket_type,
        labels: newTicket.labels,
        estimated_hours: newTicket.estimated_hours,
        created_by: newTicket.created_by, // Add created_by field
      };

      const { error: insertError } = await supabase
        .from("tickets")
        .insert([ticket]);

      if (insertError) throw insertError;

      setNewTicket({
        title: "",
        description: "",
        story_points: 0,
        assignee: "",
        status: "todo",
        deadline: "",
        media_url: "",
        priority: "medium",
        ticket_type: "feature",
        labels: [],
        estimated_hours: null,
        actual_hours: null,
        created_by: 1, // Reset with default created_by
      });

      setIsDialogOpen(false);
      fetchTickets();
    } catch (err) {
      console.error("Error creating ticket:", err);
      alert(`Failed to create ticket: ${err.message}`);
    }
  };

  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.target.classList.add("is-dragging");

    // Create a ghost image with proper sizing
    const ghost = e.target.cloneNode(true);
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    ghost.style.width = `${e.target.offsetWidth}px`; // Set explicit width

    // Find and constrain the image within the ghost
    const ghostImage = ghost.querySelector(".media-content");
    if (ghostImage) {
      ghostImage.style.maxWidth = "100%";
      ghostImage.style.height = "auto";
      ghostImage.style.objectFit = "contain";
    }

    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragEnd = async (e) => {
    e.target.classList.remove("is-dragging");
    const targetColumn = dragOverColumn;
    setDragOverColumn(null);

    if (
      targetColumn &&
      draggedTicket &&
      targetColumn !== draggedTicket.status
    ) {
      try {
        // Optimistically update UI
        const updatedTickets = tickets.map((t) =>
          t.id === draggedTicket.id ? { ...t, status: targetColumn } : t
        );
        setTickets(updatedTickets);

        // Update in Supabase
        const { error: updateError } = await supabase
          .from("tickets")
          .update({ status: targetColumn })
          .eq("id", draggedTicket.id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error("Error updating ticket status:", err);
        fetchTickets(); // Revert on error
        alert("Failed to update ticket status");
      }
    }
    setDraggedTicket(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  if (loading && !tickets.length) {
    return (
      <div className="loading">
        <Loader2 className="loading-spinner" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="project-board">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <Layout className="text-accent" size={24} />
            <h1 className="navbar-title">Project Board</h1>
          </div>
          <button
            className="button button-primary"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus size={16} />
            <span>New Ticket</span>
          </button>
        </div>
      </nav>

      {/* Board Container */}
      <div className="board-container">
        <div className="board-columns">
        {Object.entries(columns).map(([columnId, column]) => (
        <div
          key={columnId}
          className={`board-column ${
            dragOverColumn === columnId ? "dragging-over" : ""
          }`}
          onDragOver={(e) => handleDragOver(e, columnId)}
          onDragLeave={handleDragLeave}
        >
          <div className="column-header">
            <h2 className="column-title">{column.title}</h2>
            <span className="column-count">
              {tickets.filter((t) => t.status === columnId).length}
            </span>
          </div>
          <div className="droppable-column">
            {tickets
              .filter((ticket) => ticket.status === columnId)
              .map((ticket) => (
                <Ticket
                  key={ticket.id}
                  ticket={ticket}
                  teamMembers={teamMembers}
                  onDragStart={(e) => handleDragStart(e, ticket)}
                  onDragEnd={handleDragEnd}
                  onEdit={handleEditTicket}
                  onDelete={handleDeleteTicket}
                />
              ))}
          </div>
        </div>
      ))}
        </div>
      </div>

      {/* Edit Ticket Dialog */}
      {isEditDialogOpen && editingTicket && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <h2 className="dialog-title">Edit Ticket</h2>
              <button
                className="dialog-close"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTicket(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="form-control">
              {/* Title Input */}
              <input
                type="text"
                placeholder="Ticket Title"
                value={editingTicket.title}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, title: e.target.value })
                }
                className="input"
              />

              {/* Priority Select */}
              <select
                value={editingTicket.priority}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, priority: e.target.value })
                }
                className="select"
                style={{
                  backgroundColor: PRIORITY_COLORS[editingTicket.priority] + "20",
                }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>

              {/* Ticket Type Select */}
              <select
                value={editingTicket.ticket_type}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, ticket_type: e.target.value })
                }
                className="select"
              >
                {Object.entries(TICKET_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Description Textarea */}
              <textarea
                placeholder="Description"
                value={editingTicket.description}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, description: e.target.value })
                }
                className="textarea"
              />

              {/* Story Points Input */}
              <input
                type="number"
                placeholder="Story Points"
                value={editingTicket.story_points}
                onChange={(e) =>
                  setEditingTicket({
                    ...editingTicket,
                    story_points: parseInt(e.target.value) || 0,
                  })
                }
                className="input"
                min="0"
              />

              {/* Estimated Hours Input */}
              <input
                type="number"
                placeholder="Estimated Hours"
                value={editingTicket.estimated_hours || ""}
                onChange={(e) =>
                  setEditingTicket({
                    ...editingTicket,
                    estimated_hours: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className="input"
                min="0"
                step="0.5"
              />

              {/* Deadline Input */}
              <input
                type="datetime-local"
                value={editingTicket.deadline || ""}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, deadline: e.target.value })
                }
                className="input"
              />

              {/* Assignee Select */}
              <select
                value={editingTicket.assignee}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, assignee: e.target.value })
                }
                className="select"
              >
                <option value="">Select Assignee</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              {/* Labels Input */}
              <input
                type="text"
                placeholder="Labels (comma-separated)"
                value={editingTicket.labels ? editingTicket.labels.join(", ") : ""}
                onChange={(e) =>
                  setEditingTicket({
                    ...editingTicket,
                    labels: e.target.value
                      .split(",")
                      .map((label) => label.trim()),
                  })
                }
                className="input"
              />

              {/* Update Button */}
              <button
                onClick={handleUpdateTicket}
                disabled={!editingTicket.title}
                className="button button-primary"
              >
                Update Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Dialog */}
      {isDialogOpen && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <h2 className="dialog-title">Create New Ticket</h2>
              <button
                className="dialog-close"
                onClick={() => setIsDialogOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="form-control">
              {/* Title Input */}
              <input
                type="text"
                placeholder="Ticket Title"
                value={newTicket.title}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, title: e.target.value })
                }
                className="input"
              />

              {/* Priority Select */}
              <select
                value={newTicket.priority}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, priority: e.target.value })
                }
                className="select"
                style={{
                  backgroundColor: PRIORITY_COLORS[newTicket.priority] + "20",
                }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>

              {/* Ticket Type Select */}
              <select
                value={newTicket.ticket_type}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, ticket_type: e.target.value })
                }
                className="select"
              >
                {Object.entries(TICKET_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Description Textarea */}
              <textarea
                placeholder="Description"
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, description: e.target.value })
                }
                className="textarea"
              />

              {/* Story Points Input */}
              <input
                type="number"
                placeholder="Story Points"
                value={newTicket.story_points}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    story_points: parseInt(e.target.value) || 0,
                  })
                }
                className="input"
                min="0"
              />

              {/* Estimated Hours Input */}
              <input
                type="number"
                placeholder="Estimated Hours"
                value={newTicket.estimated_hours || ""}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    estimated_hours: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className="input"
                min="0"
                step="0.5"
              />

              {/* Deadline Input */}
              <input
                type="datetime-local"
                value={newTicket.deadline}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, deadline: e.target.value })
                }
                className="input"
              />

              {/* Assignee Select */}
              <select
                value={newTicket.assignee}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, assignee: e.target.value })
                }
                className="select"
              >
                <option value="">Select Assignee</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              {/* Labels Input */}
              <input
                type="text"
                placeholder="Labels (comma-separated)"
                value={newTicket.labels.join(", ")}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    labels: e.target.value
                      .split(",")
                      .map((label) => label.trim()),
                  })
                }
                className="input"
              />

              {/* File Upload Section */}
              <div className="file-upload">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                {uploadProgress > 0 && (
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                    <span className="progress-text">{uploadProgress}%</span>
                  </div>
                )}
                {newTicket.media_url && (
                  <div className="media-preview">
                    <p>Media uploaded successfully!</p>
                    <a
                      href={newTicket.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View uploaded media
                    </a>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateTicket}
                disabled={!newTicket.title}
                className="button button-primary"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !tickets.length && (
        <div className="loading">
          <Loader2 className="loading-spinner" size={32} />
        </div>
      )}

      {/* Error State */}
      {error && <div className="error">Error: {error}</div>}
    </div>
  );
};

export default ProjectBoard;
