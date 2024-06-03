import { useEffect, useState } from 'react';

import { DndContext, DragOverlay, UniqueIdentifier } from '@dnd-kit/core';

import { allIngredients, allKitchenTools, unlockedIngredients } from './lib/kitchenutils';
import {Draggable} from './lib/draggable';
import {KitchenTool} from './lib/kitchentool';
import { Ingredient, ingredientCard, Tool, ToolData, ToolsData, Timers } from './lib/definitions';

export function Kitchen() {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isAnyTimerActive, setIsAnyTimerActive] = useState(false);
    const msInterval = 10;

    const [fridgeCards] = useState(Object.entries(unlockedIngredients).map(([foodName, _], i) => (
        <Draggable key={i} id={`${foodName}_fridge`}>
            {ingredientCard(unlockedIngredients[foodName], "hover:bg-zinc-100 mx-1 my-2 cursor-pointer")}
        </Draggable>
    )));

    const [toolsData, setToolsData] = useState<ToolsData>(() => {
        const intialValue: ToolsData = {};
        for(const key in allKitchenTools){
            const tool: Tool = allKitchenTools[key]
            intialValue[tool.name] = {
                food: null,
                cooked: false,
                percentDone: 0
            }
        }
        return intialValue
    });

    const [timers, setTimers] = useState<Timers>((() => {
        const intialValue: Timers = {};
        for(const key in allKitchenTools){
            const tool: Tool = allKitchenTools[key]
            intialValue[tool.name] = {
                start: 0,
                total: 0,
                remaining: 0
            }
        }
        return intialValue
    }))

    function getCookTime(foodName: UniqueIdentifier, toolName: UniqueIdentifier): number{
        return allIngredients[foodName]['cooked']!![toolName].time
    }

    //This assumes the food can be cooked in that tool
    function getCookResult(foodName: UniqueIdentifier, toolName: UniqueIdentifier): Ingredient {
        return allIngredients[allIngredients[foodName]['cooked']!![toolName].result]
    }

    function canCookFoodInTool(foodName: UniqueIdentifier, toolName: UniqueIdentifier): boolean {
        if(allIngredients[foodName]['cooked'] === null) return false
        return allIngredients[foodName]['cooked']!![toolName] !== undefined
    }

    function getFoodName(id: UniqueIdentifier){
        return id.toString().split('_')[0]
    }

    
    useEffect(() => {
        for(const id in timers){
            if(toolsData[id].food === null || toolsData[id].cooked) continue

            const percentDone = 100*((timers[id].total - timers[id].remaining) / timers[id].total)
            const food = (percentDone !== 100 && !toolsData[id].cooked) ? toolsData[id].food : getCookResult(toolsData[id].food!!.name, id)
            setToolsData({
                ...toolsData,
                [id]: {
                    ...toolsData[id],
                    food,
                    cooked: percentDone === 100,
                    percentDone
                }
            })
        }
      }, [timers]);

      //Use one global timer to manage all the kitchen tools. Performance issues arise if each once timed itself.
      useEffect(() => {
        if(!isAnyTimerActive) {
            return;
        }
        const intervalId = setInterval(() =>
            setTimers((prevTimers) => {
                const newTimers: Timers = {}
                let anyActive = false;

                for(const id in prevTimers){
                    const prevTimer = prevTimers[id];

                    if(prevTimer.remaining !== 0){
                        anyActive = true;
                    }

                    let remaining = prevTimer.total - (new Date().getTime() - prevTimer.start)
                    if(remaining < 0) remaining = 0;

                    newTimers[id] = {
                        start: prevTimer.start,
                        total: prevTimer.total,
                        remaining
                    }
                }
                if(!anyActive){ 
                    clearInterval(intervalId);
                    setIsAnyTimerActive(false);
                }
                return newTimers;
            }), msInterval);
    
        return () => clearInterval(intervalId);
      }, [isAnyTimerActive]);

    return (
        <DndContext
            id="DndContext"
            onDragStart={(e) => {
                setActiveId(e.active.id);
            }} 
            onDragEnd={(e) => {
                if(e.over && (toolsData[e.over.id].food === null) && (canCookFoodInTool(getFoodName(e.active.id), e.over.id))){
                    setIsAnyTimerActive(true);
                    setTimers({
                        ...timers,
                        [e.over.id]: {
                            start: new Date().getTime(),
                            total: getCookTime(getFoodName(e.active.id), e.over.id),
                            remaining: getCookTime(getFoodName(e.active.id), e.over.id)
                        }
                    });
                    setToolsData({
                        ...toolsData,
                        [e.active.id.toString().split("_")[1]]: {
                            food: null,
                            cooked: false,
                            percentDone: 0
                        },
                        [e.over.id]: {
                            food: allIngredients[getFoodName(e.active.id)],
                            cooked: false,
                            percentDone: 0,
                        }
                    })
                    
                }
                setActiveId(null);
            }}>

          <div className="flex grow flex-wrap justify-center content-start md:w-5/12 md:py-4 select-none mt-2">
            {Object.entries(allKitchenTools).map(([toolName, _], i) => (
                <KitchenTool 
                    key={i} 
                    id={toolName} 
                    food={toolsData[toolName].food} 
                    percentDoneFromTimer={toolsData[toolName].percentDone}
                    isDragging={toolsData[toolName].food ? activeId === `${toolsData[toolName].food?.name}_${toolName}`: false}/>
            ))}
          </div>

          <div className="flex text-gray-800 md:w-3/12 outline outline-1 outline-zinc-400">
            <div className="flex flex-row flex-wrap mt-2 ml-2 h-min w-full justify-left select-none">
              {fridgeCards}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeId ? (
                ingredientCard(allIngredients[getFoodName(activeId)], "cursor-pointer ")
          ): null}
          </DragOverlay>
        </DndContext>
    )
}