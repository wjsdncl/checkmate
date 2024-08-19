"use client";

import API from "@/app/_api";
import Calendar from "@/app/_components/Calendar";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import useOverlay from "@/app/_hooks/useOverlay";
import SideBarWrapper from "@/app/_components/sidebar";
import { convertIsoToDateToKorean } from "@/app/_utils/IsoToFriendlyDate";
import Image from "next/image";
import tasksKey from "@/app/(team)/[id]/todo/_components/api/queryFactory";
import Popover from "@/app/_components/Popover";
import TodoItem from "@/app/(team)/[id]/todo/_components/TodoItem";
import { useGetGroupList, useGetTodoItems } from "@/app/(team)/[id]/todo/_components/api/useQuery";
import AddTaskModal from "@/app/(team)/[id]/todo/_components/AddTask";
import TodoDetail from "@/app/(team)/[id]/todo/_components/todoDetail";
import { useToggleTodoStatusMutation } from "@/app/(team)/[id]/todo/_components/api/useMutation";
import AddTodo from "@/app/(team)/[id]/todo/_components/AddTodo";

type ClientTodoProps = {
	groupId: number;
	taskListId: number;
};

function CalendarPopoverContent() {
	return (
		<div className="rounded shadow-lg">
			<Calendar.Picker />
		</div>
	);
}

export default function ClientTodo({ groupId, taskListId }: ClientTodoProps) {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [currentTaskId, setCurrentTaskId] = useState<number>(taskListId);
	const queryClient = useQueryClient();
	const pathname = usePathname();
	const overlay = useOverlay();

	const { data: groupList } = useGetGroupList(groupId);
	const { data: todoItems } = useGetTodoItems(groupId, currentTaskId, currentDate);
	const todoPatchMutation = useToggleTodoStatusMutation(groupId, currentTaskId, currentDate);

	const containerRef = useRef(null);

	const tasks = groupList?.taskLists;
	/* eslint-disable no-restricted-syntax */
	const prefetchTasks = () => {
		if (!tasks) return;
		for (const task of tasks) {
			queryClient.prefetchQuery({
				queryKey: tasksKey.detail(groupId, task.id, currentDate.toLocaleDateString("ko-KR")),
				queryFn: async () => {
					const response = API["{teamId}/groups/{groupId}/task-lists/{taskListId}/tasks"].GET({
						groupId,
						taskListId: task.id,
						date: currentDate.toLocaleDateString("ko-KR"),
					});
					return response;
				},
			});
		}
	};

	const updateSearchParams = (value: number) => {
		setCurrentTaskId(value);
		window.history.pushState(null, "", `${pathname}?taskId=${value}`);
	};

	const handleCurrentDate = (date: Date) => {
		setCurrentDate(() => date);
	};

	const handleToggleTodoStatus = (todoId: number, doneAt: string) => {
		todoPatchMutation.mutate({ taskId: todoId, done: !doneAt });
	};

	const handleAddTaskClick = () => {
		overlay.open(({ close }) => <AddTaskModal close={close} groupId={groupId} />);
	};

	const handleTodoClick = (gid: number, taskId: number, todoId: number, date: Date, doneAt: string) => {
		overlay.open(({ close }) => (
			<SideBarWrapper close={close}>
				<TodoDetail todoId={todoId} currentTaskId={taskId} close={close} currentDate={date} groupId={gid} doneAt={doneAt} />
			</SideBarWrapper>
		));
	};

	return (
		<>
			<div className="my-6 flex justify-between" ref={containerRef}>
				<Calendar onChange={(date) => handleCurrentDate(date)}>
					<div className="flex gap-3">
						<div className="flex min-w-24 items-center text-lg font-medium text-text-primary">
							<Calendar.Date>{(date) => convertIsoToDateToKorean(date)}</Calendar.Date>
						</div>
						<div className="flex gap-1">
							<Calendar.Jump to={{ unit: "day", times: -1 }}>
								<Image src="/icons/calendarLeftArrow.svg" alt="beforeDate" width={16} height={16} />
							</Calendar.Jump>
							<Calendar.Jump to={{ unit: "day", times: 1 }}>
								<Image src="/icons/calendarRightArrow.svg" alt="afterDate" width={16} height={16} />
							</Calendar.Jump>
						</div>
						<div className="relative flex items-center">
							<Popover
								gapX={-2} // X축 간격 조절
								gapY={10} // Y축 간격 조절
								anchorOrigin={{ vertical: "top", horizontal: "right" }}
								overlayOrigin={{ vertical: "top", horizontal: "left" }}
								overlay={CalendarPopoverContent}
							>
								<div className="flex items-center">
									<button type="button" aria-label="Open calendar">
										<Image src="/icons/calendarCircle.svg" alt="calendar" width={24} height={24} />
									</button>
								</div>
							</Popover>
						</div>
					</div>
				</Calendar>
				<button onClick={handleAddTaskClick} type="button" className="text-brand-primary" aria-label="addtask">
					+새로운 목록 추가하기
				</button>
			</div>
			<div className="flex gap-3 text-lg font-medium">
				{tasks &&
					tasks.map((task) => (
						<button
							className={`${task.id === currentTaskId ? "text-text-primary underline" : "text-text-default"}`}
							type="button"
							key={task.id}
							onMouseEnter={prefetchTasks}
							onClick={() => updateSearchParams(task.id)}
						>
							{task.name}
						</button>
					))}
			</div>
			<div className="mt-4 flex flex-col gap-4">
				{todoItems &&
					todoItems.map((todoItem) => (
						<TodoItem
							key={todoItem.id}
							todoItem={todoItem}
							onToggleTodo={handleToggleTodoStatus}
							onClick={handleTodoClick}
							groupId={groupId}
							taskId={currentTaskId}
							currentDate={currentDate}
						/>
					))}
			</div>

			<AddTodo containerRef={containerRef} />
		</>
	);
}
