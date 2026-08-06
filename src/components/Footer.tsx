const Footer = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-sm mt-8">
            <p>
                &copy; {new Date().getFullYear()}{" "}All rights reserved.
            </p>
            <p>Designed and built with swag by whim-stack the best frontend developer </p>
        </div>
    )
}

export default Footer