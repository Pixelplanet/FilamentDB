'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut'
        }
    }
};

interface StaggerContainerProps {
    children: ReactNode;
    className?: string;
}

export function StaggerContainer({ children, className = '' }: StaggerContainerProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface StaggerItemProps {
    children: ReactNode;
    className?: string;
    whileHover?: any;
    whileTap?: any;
}

export function StaggerItem({
    children,
    className = '',
    whileHover = { scale: 1.02, transition: { duration: 0.2 } },
    whileTap = { scale: 0.98 }
}: StaggerItemProps) {
    return (
        <motion.div
            variants={itemVariants}
            whileHover={whileHover}
            whileTap={whileTap}
            className={className}
        >
            {children}
        </motion.div>
    );
}
