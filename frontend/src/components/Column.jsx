import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import TaskCard from "./TaskCard";

export default function Column({ columnId, title, tasks, viewMode, user, onEditTask }) {
  return (
    <section className="column">
          <div className="column-header">
            <h3 className="column-title">{title}</h3>
            <div className="column-meta">
              <span className="task-count">{tasks.length}</span>
            </div>
          </div>
          <Droppable droppableId={String(columnId)}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`column-drop ${snapshot.isDraggingOver ? "drag-over" : ""}`}
              >
                {tasks.map((task, index) => (
                  <Draggable key={String(task.id)} draggableId={String(task.id)} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="draggable-item"
                      >
                        <TaskCard 
                          task={task} 
                          index={index} 
                          user={user} 
                          onEdit={onEditTask} 
                          viewMode={viewMode}
                          taskNumber={index + 1}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
    </section>
  );
}
