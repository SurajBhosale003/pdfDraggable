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
    props: [selectedId],
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
            <button className="custom-button" onClick={deleteComponent} >X</button>
            <button className="custom-button" onClick={() => {
                  if (selectedId !== null) {
                      handleRemoveImage(selectedId);
                  }else
                  {
                    setTextFieldValue("")
                  }
              }}>C</button>
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
