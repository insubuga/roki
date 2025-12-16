import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#7cfc00] to-teal-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-black" />
        </div>
      )}
      <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-3",
          isUser 
            ? "bg-[#7cfc00] text-black" 
            : "bg-[#0d1320] border border-gray-700 text-white"
        )}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <ReactMarkdown 
              className="text-sm prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed text-gray-200">{children}</p>,
                ul: ({ children }) => <ul className="my-2 ml-4 list-disc text-gray-200">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal text-gray-200">{children}</ol>,
                li: ({ children }) => <li className="my-0.5 text-gray-200">{children}</li>,
                strong: ({ children }) => <strong className="text-[#7cfc00] font-semibold">{children}</strong>,
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-gray-800 text-[#7cfc00] text-xs">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}