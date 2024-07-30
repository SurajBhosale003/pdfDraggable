import React, { useState, useRef, useEffect } from 'react';
import Moveable from 'react-moveable';
import { MoveableManagerInterface, Renderer } from "react-moveable";
import PdfRenderer from './pdfsb/PdfRenderer';
import { PDFDocument, rgb } from 'pdf-lib';
import { datapdf } from './helper/DataPDF'
import { initialComponents , DexcissTemplete , HelloDexciss } from './helper/TemplateMaping';
import { ComponentData } from './helper/Interface'


const App: React.FC = () => {
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [textFieldValue, setTextFieldValue] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
 
  const moveableRef = useRef<Moveable | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  const Editable = {
    name: "editable",
    props: [],
    events: [],
    render(moveable: MoveableManagerInterface<any, any>, React: Renderer) {
        const rect = moveable.getRect();
        const { pos2 } = moveable.state;
        const EditableViewer = moveable.useCSS("div", `
        {
            position: absolute;
            left: 0px;
            top: 0px;
            will-change: transform;
            transform-origin: 0px 0px;
        }
        .custom-button {
            width: 24px;
            height: 24px;
            margin-bottom: 4px;
            background: #283C42;
            border-radius: 4px;
            appearance: none;
            border: 0;
            color: white;
            font-weight: bold;
        }
            `);
        return <EditableViewer key={"editable-viewer"} className={"moveable-editable"} style={{
            transform: `translate(${pos2[0]}px, ${pos2[1]}px) rotate(${rect.rotation}deg) translate(10px)`,
        }}>
            <button className="custom-button" onClick={deleteComponent} >
              <svg
                viewBox="0 0 1024 1024"
                fill="currentColor"
                height="1em"
                width="1em"
              >
                <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z" />
              </svg>
            </button>
            <button className="custom-button" onClick={() => {
                  if (selectedId !== null) {
                      handleRemoveImage(selectedId);
                  }else
                  {
                    setTextFieldValue("")
                  }
              }}><svg
                    viewBox="0 0 1024 1024"
                    fill="currentColor"
                    height="1em"
                    width="1em"
                  >
                    <defs>
                      <style />
                    </defs>
                    <path d="M899.1 869.6l-53-305.6H864c14.4 0 26-11.6 26-26V346c0-14.4-11.6-26-26-26H618V138c0-14.4-11.6-26-26-26H432c-14.4 0-26 11.6-26 26v182H160c-14.4 0-26 11.6-26 26v192c0 14.4 11.6 26 26 26h17.9l-53 305.6c-.3 1.5-.4 3-.4 4.4 0 14.4 11.6 26 26 26h723c1.5 0 3-.1 4.4-.4 14.2-2.4 23.7-15.9 21.2-30zM204 390h272V182h72v208h272v104H204V390zm468 440V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H416V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H202.8l45.1-260H776l45.1 260H672z" />
                  </svg>
            </button>

  
        </EditableViewer>;
    },
} as const;



  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const addUserToComponent = () => {
    if (selectedId !== null && userInput.trim() !== '') {
      setComponents((prevComponents) =>
        prevComponents.map((component) =>
          component.id === selectedId
            ? {
                ...component,
                assign: [...(component.assign || []), userInput],
              }
            : component
        )
      );
      setUserInput('');
    }
  };

  const removeUserFromComponent = (user: string) => {
    if (selectedId !== null) {
      setComponents((prevComponents) =>
        prevComponents.map((component) =>
          component.id === selectedId
            ? {
                ...component,
                assign: (component.assign || []).filter((u) => u !== user),
              }
            : component
        )
      );
    }
  };

  const addComponent = (type: 'text' | 'image') => {
    const newComponent: ComponentData = {
      id: Date.now(),
      type,
      pageNo:1,
      name: `${type}-${Date.now()}`,
      position: { top: 50, left: 50 },
      size: { width: 100, height: 100 },
      fontSize: 16,
      value: '', 
      assign: [],
      content: type === 'text' ? '' : undefined,

      // For image default Image When Upload an image.
      // value: type === 'image' ? `data:image/png;base64,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` : undefined, 
      // assign: [],
      // content: type === 'text' ? '' : `data:image/png;base64,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`,
    };
    setComponents([...components, newComponent]);
  };

  const updateComponentPosition = (id: number, top: number, left: number) => {
    setComponents((prevComponents) =>
      prevComponents.map((component) =>
        component.id === id
          ? { ...component, position: { top, left } }
          : component
      )
    );
  };

  const updateComponentSize = (id: number | null, width: number , height: number) => {
    setComponents((prevComponents) =>
      prevComponents.map((component) =>
        component.id === id
          ? { ...component, size: { width, height } }
          : component
      )
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTextFieldValue(newText);
    if (selectedId !== null) {
      setComponents((prevComponents) =>
        prevComponents.map((component) =>
          component.id === selectedId ? { ...component, content: newText, value: newText } : component
        )
      );
    }
  };

  const handleDeselect = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.component')) {
      setSelectedId(null);
      setTarget(null);
    }
  };

  const changeTextSize = (increment: boolean) => {
    if (selectedId !== null) {
      setComponents((prevComponents) =>
        prevComponents.map((component) =>
          component.id === selectedId
            ? {
                ...component,
                fontSize: (component.fontSize || 16) + (increment ? 2 : -2),
              }
            : component
        )
      );
    }
  };

  const deleteComponent = () => {
    if (selectedId !== null) {
      setComponents((prevComponents) =>
        prevComponents.filter((component) => component.id !== selectedId)
      );
      setSelectedId(null);
      setTarget(null);
    }
  };

  const logComponentData = () => {
    const data = components.map(({ id, type, content,pageNo, value, position, size, name, fontSize, assign }) => ({
      id,
      type,
      content,
      pageNo,
      value,
      position,
      size,
      name,
      fontSize,
      assign,
    }));
    console.log(JSON.stringify(data, null, 2));
  };

  const loadComponents = () => {
    setComponents(initialComponents);
  };

  const loadDexcissComponents = () => {
    setComponents(DexcissTemplete);
  };
  const loadHelloDexcissComponents = () => {
    setComponents(HelloDexciss);
  };
  

  useEffect(() => {
    if (selectedId !== null) {
      const selectedElement = document.querySelector(`[data-id="${selectedId}"]`);
      setTarget(selectedElement as HTMLElement);
      const selectedComponent = components.find((c) => c.id === selectedId);
      if (selectedComponent?.type === 'text') {
        setTextFieldValue(selectedComponent.content || '');
        textInputRef.current?.focus();
      }
    }
  }, [selectedId, components]);

  const mergeAndPrintPDF = async () => {
    const existingPdfBytes = Uint8Array.from(atob(datapdf[0].data), char => char.charCodeAt(0));
  
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
  
    for (const component of components) {
      const { left, top } = component.position;
  
      if (component.type === 'text') {
        const fontSize = component.fontSize ?? 12;
        const yPosition = page.getHeight() - top - fontSize - 3;
        page.drawText(component.content || '', {
          x: left + 3,
          y: yPosition,
          size: component.fontSize,
          color: rgb(0, 0, 0),
          lineHeight: fontSize * 1.2,
          maxWidth: component.size.width,
        });
      } else if (component.type === 'image' && component.content) {
        const imageData = component.content.split(',')[1];
        if (!imageData) {
          console.error('Invalid image data');
          continue;
        }
  
        const imageBytes = Uint8Array.from(atob(imageData), char => char.charCodeAt(0));
        let embeddedImage;
  
        if (component.content.startsWith('data:image/png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (component.content.startsWith('data:image/jpeg') || component.content.startsWith('data:image/jpg')) {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          console.error('Unsupported image format');
          continue;
        }
  
        const { width: imageWidth, height: imageHeight } = embeddedImage;
        const containerWidth = component.size.width;
        const containerHeight = component.size.height;
  
        // Calculate scale ratio
        const widthRatio = containerWidth / imageWidth;
        const heightRatio = containerHeight / imageHeight;
        const scaleRatio = Math.min(widthRatio, heightRatio);
  
        const drawWidth = imageWidth * scaleRatio;
        const drawHeight = imageHeight * scaleRatio;
  
        // Ensure the image fits within the container dimensions
        const x = left;
        const y = page.getHeight() - top - drawHeight;
  
        page.drawImage(embeddedImage, {
          x: x,
          y: y,
          width: drawWidth,
          height: drawHeight,
        });
      }
    }
  
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const varName = "eSign"; // Can add the name or title of the PDF while saving.
    const link = document.createElement('a');
    link.href = url;
    link.download = `${varName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleRemoveImage = (componentId: number) => {
    setComponents((prevComponents) =>
      prevComponents.map((c) =>
        c.id === componentId
          ? { ...c, content: undefined, value: undefined }
          : c
      )
    );
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, componentId: number) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setComponents((prevComponents) =>
          prevComponents.map((c) =>
            c.id === componentId
              ? {
                  ...c,
                  content: base64String,
                  value: base64String,
                }
              : c
          )
        );
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="app">
  <div className="control-buttons">
    <button onClick={() => addComponent('text')}>Add Text</button>
    <button onClick={() => addComponent('image')}>Add Image</button>
    <button onClick={loadComponents}>Load Components from JSON</button>
    <button onClick={loadDexcissComponents}>Load Dexciss Component from JSON</button>
    <button onClick={loadHelloDexcissComponents}>Load Hello Component from JSON</button>
    {selectedId && (
      <>
        <button onClick={() => changeTextSize(true)}>Increase Text Size</button>
        <button onClick={() => changeTextSize(false)}>Decrease Text Size</button>
        <button onClick={deleteComponent}>Delete Component</button>
      </>
    )}
    <button onClick={logComponentData}>Log Component Data</button>
    <button onClick={mergeAndPrintPDF}>Merge and Print PDF</button>
  </div>
  {selectedId && (
    <input
      ref={textInputRef}
      type="text"
      value={textFieldValue}
      onChange={handleTextChange}
      placeholder="Edit text here"
    />
  )}
  {selectedId && (
    <div>
      <input
        type="text"
        value={userInput}
        onChange={handleUserInputChange}
        placeholder="Add user"
      />
      <button onClick={addUserToComponent}>Add User</button>
      <ul>
        {components
          .find((component) => component.id === selectedId)
          ?.assign?.map((user, index) => (
            <li key={index}>
              {user} <button onClick={() => removeUserFromComponent(user)}>Remove</button>
            </li>
          ))}
      </ul>
    </div>
  )}
  <div className="workspace" ref={workspaceRef} onClick={handleDeselect}>

    <PdfRenderer pdfData={datapdf[0].data}/>

    {components.map((component) => (
      <div
        key={component.id}
        data-id={component.id}
        className={`component ${component.type} ${selectedId === component.id ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          top: component.position.top,
          left: component.position.left,
          width: component.size.width,
          height: component.size.height,
          border: selectedId === component.id ? '1px solid red' : 'none',
          fontSize: `${component.fontSize}px`,
          userSelect: 'none',
          overflow: 'hidden',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(component.id);
        }}
      >
        {component.type === 'text' ? (
          <div
            style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize: 'inherit', outline: 'none' }}
          >
            {component.content || 'Editable Text'}
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {!component.content && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, component.id)}
              />
            )}
            {component.content && (
              <div>
                <img src={component.content} alt="Uploaded" style={{ width: '100%', height: '100%' }} />
                {/* <button onClick={() => handleRemoveImage(component.id)}>Remove Image</button> */}
              </div>
            )}
          </div>
        )}
      </div>
    ))}
    <Moveable
      ref={moveableRef}
      target={target}
      resizable
      draggable
      ables={[Editable]}
            props={{
                editable: true,
            }}
      bounds={{
        left: 0,
        top: 0,
        right: workspaceRef.current?.offsetWidth || 0,
        bottom: workspaceRef.current?.offsetHeight || 0,
      }}
      onDrag={(e) => {
        const workspaceWidth = workspaceRef.current?.offsetWidth || 0;
        const workspaceHeight = workspaceRef.current?.offsetHeight || 0;
        const elementWidth = e.target.clientWidth || 0;
        const elementHeight = e.target.clientHeight || 0;

        const top = Math.max(0, Math.min(e.top, workspaceHeight - elementHeight));
        const left = Math.max(0, Math.min(e.left, workspaceWidth - elementWidth));
        if (selectedId !== null) {
          updateComponentPosition(selectedId, top, left);
        }
      }}
      onResize={(e) => {
        const workspaceWidth = workspaceRef.current?.offsetWidth || 0;
        const workspaceHeight = workspaceRef.current?.offsetHeight || 0;

        const width = Math.max(0, Math.min(e.width, workspaceWidth));
        const height = Math.max(0, Math.min(e.height, workspaceHeight));
        e.target.style.width = `${width}px`;
        e.target.style.height = `${height}px`;
        if (selectedId !== null) {
          updateComponentSize(selectedId, width, height);
        }
      }}
      onScale={(e) => {
        const workspaceWidth = workspaceRef.current?.offsetWidth || 0;
        const workspaceHeight = workspaceRef.current?.offsetHeight || 0;

        const component = components.find((c) => c.id === selectedId);
        if (component) {
          const newWidth = Math.max(0, Math.min(component.size.width * e.scale[0], workspaceWidth));
          const newHeight = Math.max(0, Math.min(component.size.height * e.scale[1], workspaceHeight));
          updateComponentSize(selectedId, newWidth, newHeight);
        }
      }}
    />
  </div>
</div>

  );
};

export default App;
